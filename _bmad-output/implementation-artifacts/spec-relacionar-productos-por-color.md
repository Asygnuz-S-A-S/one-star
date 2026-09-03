---
title: 'Relacionar productos independientes como colores de un mismo modelo'
type: 'feature'
created: '2026-08-06'
status: 'done'
baseline_commit: '6ede2d70e3a9563e7b2dd46fb44a725191127de3'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/REQUERIMIENTOS.md'
  - '{project-root}/docs/stories/story-003.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-miniaturas-interactivas-colores-producto.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Loggro representa cada color de un modelo como un `Product` independiente, con sus propias tallas, SKU, stock y fotos. One Star no permite relacionarlos, por lo que la tienda no puede presentarlos como la tarjeta “Nike Revolution 7 Kids” ni cambiar al producto correcto al elegir otro color.

**Approach:** Crear una familia explícita de colores administrable desde la edición del producto. El catálogo mostrará una sola tarjeta por familia con miniaturas de sus productos; la ficha mostrará los mismos colores y cada selección navegará al `slug` del producto correspondiente, conservando inventario, precio, variantes e imágenes independientes.

## Boundaries & Constraints

**Always:** Mantener cada producto y sus variantes como unidades independientes de Loggro; guardar la relación de familia de forma bidireccional y transaccional; usar únicamente colores reales de `Variant.color` e imágenes del producto correspondiente; permitir relacionar y retirar productos desde cualquier miembro de la familia; mantener filtros, orden, conteo y paginación sobre familias visibles más productos no agrupados; usar `Link` para navegar entre colores; preservar estas relaciones durante futuras sincronizaciones ERP.

**Ask First:** Fusionar dos familias ya existentes, elegir manualmente un producto principal, relacionar automáticamente por nombre/SKU, o modificar nombres, precios, stock y fotos al crear la relación.

**Never:** Convertir colores en tallas; mover variantes entre productos; duplicar inventario; usar `crossSells` como relación de color; inferir parentesco por semejanza de nombres; enviar la relación a Loggro; borrar o reescribir datos ERP existentes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Crear familia | Desde A se agregan B y C | A, B y C quedan en una única familia | IDs repetidos o el propio A se normalizan |
| Producto ya agrupado | Se intenta agregar un producto perteneciente a otra familia | No se modifica ninguna familia | Mensaje claro para retirar o gestionar primero esa familia |
| Retirar un color | Desde A se elimina B y se guarda | B queda independiente; los demás conservan la familia | Si queda un solo miembro, se disuelve la familia |
| Catálogo | Una familia tiene tres productos y hay dos productos sueltos | Se muestran tres tarjetas: una familiar y dos individuales | El total y la paginación usan esas tres unidades visibles |
| Selección de color | Se elige la miniatura de B desde la tarjeta o ficha de A | Navega al `slug` de B y muestra solo variantes, precio, stock y fotos de B | Una foto ausente usa el placeholder existente sin inventar datos |
| Sin relación | Producto con varios colores internos o sin familia | Conserva el comportamiento actual | No cambia su información ni navegación |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` y `prisma/migrations/*_add_product_color_families/migration.sql` -- familia y FK nullable, sin backfill destructivo.
- `src/server/domain/product-color-family.plan.ts` -- reglas puras para sincronizar miembros y agrupar resultados del catálogo.
- `src/server/repositories/product.repository.ts` -- consultas de familia, búsqueda administrativa y persistencia transaccional.
- `src/server/services/product.service.ts`, `src/server/validators/product.validator.ts` y `src/app/admin/productos/actions.ts` -- contrato validado `colorFamilyProductIds` y DTO de colores relacionados.
- `src/components/admin/ProductForm.tsx` y `src/types/admin.ts` -- buscador y lista “Colores del mismo modelo”, separados de cross-selling.
- `src/components/shop/AnimatedProductGrid.tsx`, `src/components/home/ProductCard.tsx` y `src/lib/product-card-colors.ts` -- una tarjeta por familia y miniaturas enlazadas al producto/color correcto.
- `src/components/product/ProductDetail.tsx`, `src/components/product/ProductInfo.tsx` y `src/types/shop.ts` -- selector de productos de color en la ficha.
- `docs/architecture.md` -- documentar que la familia es local y agnóstica al ERP.

## Tasks & Acceptance

**Execution:**
- [x] `src/server/domain/__tests__/product-color-family.plan.test.ts` y `src/lib/__tests__/product-card-colors.test.ts` -- cubrir incrementalmente cada regla y transición rojo-verde.
- [x] `prisma/schema.prisma` y migración -- añadir la relación nullable e índice; generar Prisma y verificar avance/retroceso documentado.
- [x] Repositorio, servicio, validador y actions de producto -- guardar la familia atómicamente, rechazar cruces entre familias y devolver hermanos ligeros sin tocar el adaptador ERP.
- [x] Formulario y tipos de administración -- reutilizar la búsqueda existente con estado independiente, mostrar color/foto y permitir agregar o retirar miembros.
- [x] Grid, tarjeta, helper de colores y ficha -- colapsar familias, previsualizar y navegar al producto correcto, manteniendo el flujo previo para productos no agrupados.
- [x] `docs/architecture.md` y pruebas de servicio/componentes -- registrar la decisión y proteger sincronización, filtros, paginación y relaciones.

**Acceptance Criteria:**
- Given productos separados por color provenientes de Loggro, when el administrador los relaciona y guarda, then cada producto conserva sus variantes y la relación aparece al editar cualquiera de ellos.
- Given una familia publicada, when el comprador consulta un catálogo, then ve una sola tarjeta con el total de colores y una miniatura navegable por producto.
- Given que el comprador elige otro color, when abre su ficha, then ve el precio, tallas, stock, SKU, fotos y URL del producto seleccionado, nunca una mezcla de los hermanos.
- Given una sincronización posterior de Loggro, when actualiza catálogo o inventario, then las familias locales permanecen intactas.

## Design Notes

`ProductColorFamily` expresa una relación local uno-a-muchos; `Product.colorFamilyId` es nullable y no forma parte de `IERPAdapter`. No se define un “principal” editable: el catálogo elige de forma determinista el primer producto según el orden activo, evitando trabajo adicional en admin. Para una familia, cada opción visual lleva `productId`, `slug`, color e imagen propios; seleccionarla cambia de producto, no de variante del producto actual.

## Verification

**Commands:**
- `pnpm vitest run <tests-de-familia-y-producto>` -- reglas de familia, DTO y miniaturas verdes.
- `pnpm prisma validate && pnpm prisma generate` -- esquema y cliente válidos.
- `pnpm test && pnpm exec tsc --noEmit` -- suite y tipos sin regresiones.
- `pnpm exec eslint <archivos-modificados> && pnpm build` -- calidad y compilación de producción correctas.

**Manual checks (if no CLI):**
- Relacionar dos productos reales en admin; confirmar una sola tarjeta, navegación entre miniaturas y variantes/fotos independientes en desktop y móvil.

## Suggested Review Order

**Modelo y persistencia**

- Empieza por la transacción que valida y mantiene familias sin mezclar inventario ERP.
  [`product.repository.ts:194`](../../src/server/repositories/product.repository.ts#L194)

- La migración agrega una familia local y una FK nullable no destructiva.
  [`migration.sql:1`](../../prisma/migrations/20260806150000_add_product_color_families/migration.sql#L1)

- Las reglas puras cubren creación, disolución, colores válidos y paginación visible.
  [`product-color-family.plan.ts:31`](../../src/server/domain/product-color-family.plan.ts#L31)

**Contratos de consulta**

- Catálogo colapsa familias; administración conserva cada producto ERP individual.
  [`product.service.ts:379`](../../src/server/services/product.service.ts#L379)

- El editor recibe todos los hermanos para evitar disolver relaciones al guardar.
  [`product.repository.ts:94`](../../src/server/repositories/product.repository.ts#L94)

**Experiencia administrativa**

- El buscador independiente evita carreras y bloquea relaciones ambiguas o inválidas.
  [`ProductForm.tsx:429`](../../src/components/admin/ProductForm.tsx#L429)

- La sección permite agregar y retirar colores conservando datos propios de Loggro.
  [`ProductForm.tsx:942`](../../src/components/admin/ProductForm.tsx#L942)

**Experiencia de compra**

- Cada tarjeta combina producto y hermanos en opciones enlazadas por slug.
  [`AnimatedProductGrid.tsx:22`](../../src/components/shop/AnimatedProductGrid.tsx#L22)

- Fotos generales y ausentes reciben una miniatura navegable con placeholder.
  [`product-card-colors.ts:93`](../../src/lib/product-card-colors.ts#L93)

- La ficha navega al producto-color real y mantiene sus tallas y stock aislados.
  [`ProductInfo.tsx:267`](../../src/components/product/ProductInfo.tsx#L267)

**Pruebas y documentación**

- Las pruebas protegen colapso público y listado administrativo sin ocultar miembros.
  [`product.service.test.ts:148`](../../src/server/services/__tests__/product.service.test.ts#L148)

- La arquitectura documenta que las familias son locales y agnósticas al ERP.
  [`architecture.md:123`](../../docs/architecture.md#L123)
