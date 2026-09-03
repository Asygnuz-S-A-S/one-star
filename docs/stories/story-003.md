# Story 003 — CRUD de Productos en Panel Admin con Variantes e Imágenes

**Epic:** Epic 4 — Panel de Administración  
**Prioridad:** P0 (necesario para cargar los 200 productos iniciales)  
**Estado:** En progreso — listado y estructura de rutas existen, formulario de edición pendiente  
**Story points:** 8

---

## User Story

**Como** operador de One Star,  
**quiero** crear y editar productos con todas sus variantes, imágenes y metadatos SEO desde el panel de administración,  
**para** publicar el catálogo de 200 productos y mantenerlo actualizado sin depender del equipo técnico.

---

## Contexto Técnico

Existen `src/app/admin/productos/page.tsx` (listado), `src/app/admin/productos/nuevo/page.tsx`, `src/app/admin/productos/[id]/page.tsx`, y `src/app/admin/productos/actions.ts`. Los servicios y repositorios de producto y variante están implementados. Falta el formulario completo con gestión de imágenes y variantes múltiples.

**Archivos relevantes:**
- `src/app/admin/productos/nuevo/page.tsx`
- `src/app/admin/productos/[id]/page.tsx`
- `src/app/admin/productos/actions.ts`
- `src/server/services/product.service.ts`
- `src/server/services/variant.service.ts`
- `src/server/repositories/product.repository.ts`
- `src/server/validators/product.validator.ts`
- `src/server/repositories/variant.repository.ts`

---

## Criterios de Aceptación

### Formulario de producto

- **Dado** que el operador está en `/admin/productos/nuevo`,  
  **cuando** completa el formulario y guarda,  
  **entonces** el producto aparece en el catálogo público en la categoría correcta.
- Campos obligatorios: nombre, slug (auto-generado desde nombre, editable), categoría, género, precio base.
- Campos opcionales: marca, precio de oferta (`isOnSale` toggle), descripción corta, descripción extendida, URL de video, metaTitle, metaDescription.
- **Dado** que el slug ya existe,  
  **cuando** el operador guarda,  
  **entonces** ve el error "Este slug ya está en uso" junto al campo.

### Gestión de imágenes

- El formulario permite subir múltiples imágenes (mínimo 5, máximo 10).
- El operador puede reordenar imágenes mediante drag-and-drop (@atlaskit/pragmatic-drag-and-drop ya disponible).
- Cada imagen requiere un campo `alt` para accesibilidad y SEO.
- **Dado** que el operador elimina una imagen,  
  **cuando** guarda,  
  **entonces** la imagen se elimina del servidor y no aparece en la ficha del producto.

### Gestión de variantes

- El formulario tiene una sección "Variantes" con tabla editable.
- Cada fila representa una variante: SKU (auto-sugerido editable), Talla (texto libre), Talla US, Talla CM, Talla EUR, Color, Stock.
- El operador puede agregar filas con "+" y eliminar con "×".
- **Dado** que dos variantes tienen el mismo SKU,  
  **cuando** el operador guarda,  
  **entonces** ve el error "SKU duplicado en variante X".
- Stock de cada variante se puede actualizar independientemente.

### Listado de productos

- La tabla de `/admin/productos` muestra: nombre, categoría, marca, precio, nº variantes, nº imágenes, estado (activo/sin stock).
- TanStack Table con ordenamiento por columna y búsqueda por nombre.
- Paginación servidor-side (20 productos por página).

### Edición

- **Dado** que el operador navega a `/admin/productos/[id]`,  
  **cuando** la página carga,  
  **entonces** el formulario está prellenado con todos los datos del producto incluyendo variantes e imágenes en orden.
- Los cambios en variantes (editar stock, agregar nuevas, eliminar existentes) se guardan transaccionalmente.

### Validación

- Toda validación usa los esquemas Zod de `product.validator.ts`.
- Los errores de validación se muestran inline junto a cada campo.

---

## Tareas de Implementación

- [ ] Implementar `ProductForm.tsx` componente reutilizable para nuevo/editar
- [ ] Implementar `VariantTable.tsx` con filas editables y botones +/×
- [ ] Implementar `ImageUploader.tsx` con drag-and-drop para reordenar y campo alt
- [ ] Definir estrategia de almacenamiento de imágenes (ver `docs/architecture.md` P2) y actualizar `product.validator.ts`
- [ ] Actualizar `src/app/admin/productos/actions.ts` con acciones `createProduct`, `updateProduct`, `deleteProduct` usando `product.service.ts` y `variant.service.ts`
- [ ] Actualizar listado en `page.tsx` con TanStack Table, paginación y búsqueda
- [ ] Tests unitarios en `product.service.ts` — create, update con variantes, delete

---

## Definición de Done

- [ ] Formulario crea producto con mínimo 1 variante y 1 imagen correctamente
- [ ] Edición prellenada funciona en producto con 10 imágenes y 20 variantes
- [ ] Drag-and-drop de imágenes funciona en Chrome Desktop
- [ ] Validación Zod muestra todos los errores inline sin perder datos del formulario
- [ ] Listado muestra 200 productos paginados en < 500 ms (con seed de BD)
- [ ] Tests de `product.service.ts` con ≥ 80 % cobertura
- [ ] Admin requiere autenticación — cualquier intento anónimo redirige a `/admin/login`
