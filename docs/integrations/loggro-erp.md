# Integración Loggro ERP

Este documento detalla el funcionamiento interno de la integración con Loggro Pymes para One Star E-Commerce.

## 1. Conexión y Autenticación
La integración utiliza los endpoints oficiales de Loggro para PYMES:
- **Base URL:** `https://api.loggro.com`
- **Endpoint Productos (catálogo):** `GET /apik/loggro-inventario/v1/items`
- **Endpoint Unidades de Medida:** `GET /apik/loggro-inventario/v1/productos/unidades-medida`
- **Establecimientos:** `GET /apik/loggro-inventario/v1/estructura-empresarial/establecimientos`
- **Bodegas:** `GET /apik/loggro-inventario/v1/estructura-empresarial/bodegas`
- **Existencias (stock):** `POST /apik/loggro-inventario/v1/productos/disponibilidad-productos`

La autenticación se realiza mediante un `Bearer Token` estático configurado en las variables de entorno (`LOGGRO_API_TOKEN`). **Todas las peticiones deben enviar `Content-Type: application/json`**, incluso los `GET` (Loggro responde `415` si falta).

### Consulta de existencias (stock)

El endpoint de catálogo **no** incluye existencias. El stock se consulta aparte:

```jsonc
// POST /apik/loggro-inventario/v1/productos/disponibilidad-productos
{
  "establecimientoUuid": "…",   // o "establecimientoCodigo"
  "bodegaUuid": "…",            // la bodega debe pertenecer al establecimiento
  "items": [{ "codigoItem": "M7652-4" }]
}
// → 200 { "contenido": [ { "codigo": "M7652-4", "cantidadDisponible": 3 } ] }
```

Notas de comportamiento:
- Con alcance `primary`, el establecimiento y la bodega se resuelven desde
  `LOGGRO_ESTABLECIMIENTO_UUID` / `LOGGRO_BODEGA_UUID`, o se auto-detectan (establecimiento tipo
  `EST` + su bodega hija). Una bodega configurada debe pertenecer a la sede seleccionada y no
  puede ser de `Separados`; un override inconsistente se rechaza en vez de publicar otro stock.
- Con alcance `all`, se auto-detecta una bodega publicable por cada sede `EST`; el override de la
  ubicación principal no limita la consolidación de las demás tiendas.
- Cuando una sede tiene varias bodegas, la auto-detección prioriza la denominada
  `Bodega Punto de Venta`; las bodegas de `Separados` se excluyen del stock publicable. Si no
  existe una bodega publicable, la lectura queda parcial en vez de usar una bodega por posición.
- Los lotes de disponibilidad se consultan con concurrencia acotada. Cada petición conserva su
  propio acumulador y solo después se consolidan las sedes, evitando tanto la ejecución
  estrictamente secuencial como el estado mutable compartido.
- La descarga completa tiene un presupuesto total de 60 segundos y cada lote permite como máximo
  10 descartes de códigos inválidos. Al superar cualquiera de los límites, el snapshot queda
  parcial y no puede escribir inventario.
- La consulta es **estricta**: si un `codigoItem` no es un ítem inventariable (p. ej. un producto base sin talla), Loggro responde `400 "Producto no encontrado: X"` para **todo** el lote. El cliente descarta el código faltante y reintenta con el resto.
- Una respuesta completa con todos los SKU en cero se clasifica como `all_zero` y bloquea las
  escrituras. No se interpreta como inventario válido hasta contrastar un SKU positivo conocido.

## 2. Arquitectura de Mapeo de Catálogo (Flat vs Jerárquico)
El desafío principal de la integración es la diferencia en los modelos de datos:
- **Loggro:** Maneja "Items" (cada talla y color es un registro plano con su propio SKU).
- **One Star:** Maneja "Products" (Contenedor padre) y "Variants" (Hijos con Talla/Color y SKU).

### Lógica de Agrupación Automática
El motor de sincronización (`src/server/services/erp-sync.service.ts`) implementa una agrupación inteligente por prefijo de SKU:

1. **Estructura del SKU en Loggro:** Se espera que los ítems sigan un formato con un guión separador: `[PADRE]-[VARIANTE]` (Ej: `CAM01-M-ROJ`).
2. **Extracción:**
   - Todo lo que está antes del primer guión se considera el `slug` del **Producto Padre** (`CAM01`).
   - Todo lo que está después se considera el detalle de la **Variante** (`M-ROJ`).
3. **Casos sin guión:** Si el SKU no tiene guión (Ej: `ZAPATO`), se crea el producto `ZAPATO` con una única variante de talla `"Única"`.

## 3. Comportamiento del Upsert (Preservación de Datos)
Para asegurar que Loggro mantenga el control contable sin destruir el enriquecimiento visual del E-Commerce:

| Dato | Quien Manda | Comportamiento |
|---|---|---|
| Nombre Producto | Loggro | Solo se asigna al crear. Si se edita en Web, se conserva en Web. |
| Precio Base | Loggro | **Loggro Sobrescribe siempre** en cada sincronización. |
| Stock | Loggro | **Loggro Sobrescribe siempre** en cada sincronización (a nivel variante). |
| Unidad de Medida | Loggro | **Loggro Sobrescribe siempre**. |
| Género | Compartido | Loggro completa el campo solo si está vacío; una selección manual se conserva. |
| Categoría | Compartido | Al crear, el adaptador puede sugerir Accesorios o Chanclas y Sandalias desde el nombre; sin señal segura usa "Sin Categoría". Después One Star mantiene el control. |
| Marca | Compartido | Al crear, el adaptador normaliza nombre + código ERP; después One Star mantiene el control. |
| Imágenes | One Star | Loggro no envía imágenes. One Star mantiene el control. |
| Descripción Larga | One Star | One Star mantiene el control. |

El adaptador deduce el género solo a partir de palabras completas y explícitas: Hombre/Caballero,
Mujer/Dama, Unisex, Niño, Niña, Infantil/Junior/Kids y Bebé. El nombre del producto padre tiene
precedencia sobre descripciones de talla contradictorias; si no hay una señal segura, el campo
queda vacío. El core recibe únicamente el valor normalizado y no conoce estas reglas de Loggro.

Para completar productos históricos se usa un backfill separado del stock: primero genera una
vista previa de filas realmente vacías y su huella SHA-256; la aplicación exige la misma huella y
recalcula los candidatos antes de escribir. Cada actualización usa `erpId + gender IS NULL`, por
lo que el proceso es idempotente y no sobrescribe una edición administrativa concurrente.

La categoría sigue el mismo principio de preservación, pero con reglas independientes dentro del
adaptador Loggro. El core recibe una sugerencia normalizada (`slug` y nombre), sin conocer palabras
propias del ERP. En el alta de un producto nuevo se utiliza esa sugerencia; una sincronización
recurrente nunca reclasifica productos existentes. El backfill histórico exige vista previa y
huella SHA-256, y actualiza únicamente filas que todavía estén en `sin-categoria`, evitando pisar
una selección manual o concurrente.

La marca también llega al core como una sugerencia normalizada (`slug` y nombre). Las reglas de
códigos y errores ortográficos viven únicamente en el adaptador Loggro; el código `008`, que mezcla
varias marcas, se desambigua por el nombre del producto. Los nuevos productos usan la sugerencia,
pero la sincronización recurrente no cambia marcas existentes. El backfill histórico exige huella
SHA-256 y reemplaza solo relaciones cuyo producto, código ERP y nombre `Por nombrar (00X)` sigan
coincidiendo; después elimina únicamente marcas provisionales sin productos.

## Flujo de ventas (Web → Loggro)

> **Contención temporal (2026-08-13):** los pedidos recién creados permanecen en estado
> `PENDING` y no invocan `onOrderConfirmed`. Por tanto, no generan salidas en Loggro antes de
> confirmar el pago. La exportación se reactivará únicamente desde una transición idempotente a
> `PAID`, después de completar la reparación de inventario. Ver
> [la línea base de la contención](loggro-baseline-2026-08-13.md).

Cuando el flujo de exportación esté habilitado y se confirme el pago, `onOrderConfirmed` (en
`loggro.adapter.ts`) **descuenta el stock** en Loggro registrando una salida de inventario:

```jsonc
// POST /apik/loggro-inventario/v1/salidas
{
  "establecimiento": "One Star Fundadores",   // nombre (requerido)
  "establecimientoUuid": "…",
  "observacion": "Salida por venta One Star (e-commerce)",
  "detallesSalida": [{ "codigoItem": "M7652-4", "cantidad": 1 }]
}
// → 200 { "datos": "<uuid-de-la-salida>" }
```

> **Pendiente:** la facturación electrónica y el upsert de cliente (`createInvoice`, `upsertCustomer`) aún no están mapeados a endpoints reales de Loggro; `onOrderConfirmed` no los invoca todavía.

## 4. Agregando Nuevos Endpoints
Cualquier nueva consulta a Loggro debe seguir este flujo:
1. Añadir el método en `src/server/erp/adapters/loggro.client.ts`.
2. Mapear el resultado en `src/server/erp/adapters/loggro.adapter.ts`.
3. Consumirlo en el servicio de negocio correspondiente a través del adaptador genérico devuelto por `getERPAdapter()`.
