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
- El establecimiento y la bodega se resuelven en `loggro.client.ts` desde `LOGGRO_ESTABLECIMIENTO_UUID` / `LOGGRO_BODEGA_UUID`, o se auto-detectan (establecimiento tipo `EST` + su bodega hija).
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
| Categoría | One Star | Loggro asigna "Sin Categoría" al crear. Luego One Star mantiene el control. |
| Imágenes | One Star | Loggro no envía imágenes. One Star mantiene el control. |
| Descripción Larga | One Star | One Star mantiene el control. |

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
