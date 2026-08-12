# Integración Loggro ERP

Este documento detalla el funcionamiento interno de la integración con Loggro Pymes para One Star E-Commerce.

## 1. Conexión y Autenticación
La integración utiliza los endpoints oficiales de Loggro para PYMES:
- **Base URL:** `https://api.loggro.com`
- **Endpoint Productos:** `/apik/loggro-inventario/v1/items`
- **Endpoint Unidades de Medida:** `/apik/loggro-inventario/v1/productos/unidades-medida`

La autenticación se realiza mediante un `Bearer Token` estático configurado en las variables de entorno (`LOGGRO_API_TOKEN`).

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

## 4. Agregando Nuevos Endpoints
Cualquier nueva consulta a Loggro debe seguir este flujo:
1. Añadir el método en `src/server/erp/adapters/loggro.client.ts`.
2. Mapear el resultado en `src/server/erp/adapters/loggro.adapter.ts`.
3. Consumirlo en el servicio de negocio correspondiente a través del adaptador genérico devuelto por `getERPAdapter()`.
