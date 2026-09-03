---
title: 'Colores disponibles en las tarjetas del catálogo'
type: 'feature'
created: '2026-07-29'
status: 'done'
baseline_commit: '3b00dd43dc897e3b2151023ab49e1805a1f5d05e'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/REQUERIMIENTOS.md'
  - '{project-root}/docs/stories/story-001.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Las tarjetas de `/productos` no informan cuántos colores tiene disponible cada modelo. El comprador debe entrar a la ficha para descubrirlos, mientras que referentes como Adidas muestran esa variedad directamente en el catálogo.

**Approach:** Añadir a cada tarjeta una franja visual con los colores distintos de sus variantes y el texto “1 color” o “N colores”. Cuando exista una imagen etiquetada para un color se mostrará como miniatura; en caso contrario se usará el swatch de la paleta administrable de One Star.

## Boundaries & Constraints

**Always:** Derivar los colores exclusivamente de `Variant.color`; ignorar valores vacíos o históricos como `N/A`; deduplicar sin distinguir mayúsculas ni acentos; asociar la primera `ProductImage` cuyo `color` coincida; usar `next/image`; conservar el enlace, precio, oferta, stock, animación y comportamiento actual de la tarjeta; mantener legibilidad en la cuadrícula móvil de dos columnas.

**Ask First:** Cualquier cambio que requiera agrupar registros `Product` distintos, alterar la sincronización del ERP, migrar datos o modificar el esquema Prisma.

**Never:** Inferir colores desde el nombre, SKU o URL de una imagen; inventar colores para productos sin asignación; modificar admin, ERP, filtros, ficha de producto o base de datos; sobrescribir los cambios locales existentes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Varios colores | Variantes repetidas por talla en “Blanco”, “Negro” y “Café” | Tres opciones únicas y texto “3 colores” | N/A |
| Color con foto | Existe `ProductImage.color` coincidente | La opción usa esa primera imagen como miniatura | N/A |
| Color sin foto | La variante tiene color real pero ninguna foto coincidente | La opción usa el swatch de la paleta | Color desconocido usa el tono de respaldo existente |
| Datos incompletos | Colores vacíos, `N/A` o duplicados con diferencias de mayúsculas/acentos | Se omiten los inválidos y se deduplican los equivalentes | Si no queda ningún color, no se publica información engañosa |
| Muchos colores | Más opciones que el máximo visible de la tarjeta | Se muestran las primeras opciones y un indicador `+N`; el texto conserva el total real | N/A |

</frozen-after-approval>

## Code Map

- `src/lib/product-card-colors.ts` -- transformación pura de variantes e imágenes en opciones de color para catálogo.
- `src/lib/__tests__/product-card-colors.test.ts` -- cobertura de deduplicación, imágenes, datos inválidos y exceso de colores.
- `src/components/shop/AnimatedProductGrid.tsx` -- prepara las opciones desde cada `ProductDTO` y las entrega a la tarjeta.
- `src/components/home/ProductCard.tsx` -- renderiza miniaturas/swatches y cantidad sin cambiar las acciones existentes.
- `src/components/shop/ProductGrid.tsx` -- transporta la paleta dinámica al grid animado.
- `src/app/productos/page.tsx` -- entrega al catálogo la misma paleta ya usada por el filtro.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/__tests__/product-card-colors.test.ts` -- escribir una prueba fallida por comportamiento y comprobar cada transición rojo-verde.
- [x] `src/lib/product-card-colors.ts` -- implementar la transformación determinista y el límite visual sin depender de React.
- [x] `src/app/productos/page.tsx`, `src/components/shop/ProductGrid.tsx` y `src/components/shop/AnimatedProductGrid.tsx` -- transportar la paleta y las opciones manteniendo `ProductDTO` como fuente de datos.
- [x] `src/components/home/ProductCard.tsx` -- incorporar la franja accesible y responsive con miniaturas `Image`, swatches y contador.

**Acceptance Criteria:**
- Given un producto con variantes de varios colores, when aparece en `/productos`, then la tarjeta muestra una representación por color y el total correcto en singular o plural.
- Given que algunas tallas repiten el mismo color, when se construye la tarjeta, then ese color aparece una sola vez.
- Given una cuadrícula móvil de dos columnas, when hay muchos colores, then la tarjeta no se desborda ni tapa el nombre, precio o botón.
- Given un producto sin colores reales, when se renderiza, then la tarjeta conserva su funcionamiento actual y no inventa una cantidad.
- Given filtros, paginación u ordenamiento activos, when cambia el listado, then las tarjetas siguen mostrando los colores de los productos resultantes.

## Spec Change Log

## Design Notes

La relación válida es `Product → Variant.color`; no se agrupan productos diferentes por nombre aproximado. La miniatura es una mejora progresiva: `ProductImage.color` coincidente primero, swatch dinámico después. El contador usa todos los colores únicos aunque la franja compacte el exceso con `+N`.

## Verification

**Commands:**
- `pnpm vitest run src/lib/__tests__/product-card-colors.test.ts` -- helper verde tras cada incremento TDD.
- `pnpm test` -- suite completa sin regresiones.
- `pnpm lint` -- sin errores nuevos en los archivos modificados.
- `pnpm build` -- tipos, límites cliente/servidor y uso de `next/image` válidos.

**Manual checks (if no CLI):**
- Revisar `/productos` en móvil y escritorio con productos de cero, uno y varios colores; confirmar miniaturas/swatches, pluralización, `+N`, navegación y ausencia de desbordes.

## Suggested Review Order

**Flujo de datos**

- Empieza aquí: cada DTO se transforma una vez antes de renderizar la tarjeta.
  [`AnimatedProductGrid.tsx:26`](../../src/components/shop/AnimatedProductGrid.tsx#L26)

- Deduplica variantes, relaciona fotos y compacta colores para móvil.
  [`product-card-colors.ts:28`](../../src/lib/product-card-colors.ts#L28)

- Transporta la paleta administrable sin mezclar lógica de negocio en la UI.
  [`ProductGrid.tsx:158`](../../src/components/shop/ProductGrid.tsx#L158)

**Presentación accesible**

- Renderiza miniaturas, swatches, contador y `+N` sin alterar acciones existentes.
  [`ProductCard.tsx:175`](../../src/components/home/ProductCard.tsx#L175)

- Normaliza acentos para evitar swatches grises de colores equivalentes.
  [`colors.ts:80`](../../src/lib/colors.ts#L80)

**Cobertura del catálogo**

- Usa la paleta dinámica en el catálogo principal.
  [`page.tsx:53`](../../src/app/productos/page.tsx#L53)

- Mantiene la misma paleta en categorías, lanzamientos y ofertas.
  [`sale/page.tsx:51`](../../src/app/sale/page.tsx#L51)

**Pruebas**

- Protege deduplicación, imágenes, datos inválidos, pluralización y límite móvil.
  [`product-card-colors.test.ts:5`](../../src/lib/__tests__/product-card-colors.test.ts#L5)

- Verifica coincidencia de paleta ignorando acentos y mayúsculas.
  [`colors.test.ts:5`](../../src/lib/__tests__/colors.test.ts#L5)
