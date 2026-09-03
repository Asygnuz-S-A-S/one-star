---
title: 'Miniaturas interactivas por color en tarjetas de producto'
type: 'feature'
created: '2026-07-29'
status: 'done'
baseline_commit: 'e0df7e7135ed6130009abfed831546ccd9d3caaf'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/REQUERIMIENTOS.md'
  - '{project-root}/docs/stories/story-001.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-catalogo-colores-disponibles.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La franja del catálogo representa algunos colores mediante círculos, pero el referente de Adidas muestra fotografías reales de cada color y permite previsualizarlas sobre la imagen principal. Los círculos no permiten al comprador reconocer cómo se ve el tenis completo en ese color.

**Approach:** Reemplazar la franja de swatches por una galería horizontal de miniaturas reales, construida únicamente con `ProductImage.color`. Al pasar el cursor, enfocar o tocar una miniatura, su foto se convierte en la imagen principal de la tarjeta; al abandonar la tarjeta se restaura la vista inicial.

## Boundaries & Constraints

**Always:** Mostrar solo miniaturas que tengan una URL real y un color correspondiente a una variante del mismo `Product`; mantener todas las opciones accesibles mediante desplazamiento horizontal; cambiar la imagen con hover, foco y clic/tap; indicar visualmente y con `aria-pressed` cuál miniatura está activa; usar `next/image`; impedir que interactuar con una miniatura navegue accidentalmente; conservar el enlace general, favorito, precio, oferta, stock, contador y animación actual de la tarjeta.

**Ask First:** Agrupar registros `Product` distintos como si fueran colores del mismo modelo; modificar datos, admin, ERP, Prisma o la forma de cargar imágenes; decidir una imagen para un color que no tenga `ProductImage.color` coincidente.

**Never:** Mostrar círculos de color en esta franja; inferir color/modelo desde nombres, SKU o URLs; duplicar una miniatura por cada talla; inventar imágenes; mezclar imágenes generales (`color = null`) como si fueran otro color; sobrescribir trabajo ajeno.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Varios colores con fotos | Seis variantes únicas y al menos una foto etiquetada por cada color | Seis miniaturas reales desplazables y texto “6 colores” | N/A |
| Hover o foco | El usuario se sitúa sobre la miniatura “Negro” | La imagen principal cambia a la primera foto de “Negro” y la miniatura queda activa | N/A |
| Tap/clic | El usuario toca una miniatura en móvil | Cambia la vista previa sin abrir la ficha | La ficha sigue accesible desde el resto de la tarjeta |
| Color sin foto | Existe `Variant.color`, pero no una foto etiquetada equivalente | No se muestra círculo ni miniatura falsa para ese color | La tarjeta conserva su imagen principal |
| Fotos repetidas | Varias fotos comparten el mismo color | Solo la primera representa ese color en la franja | Las demás siguen disponibles en la galería normal |
| Sin fotos por color | Todas las fotos son generales o el producto no tiene fotos | No se renderiza la franja interactiva | La tarjeta conserva el comportamiento actual |

</frozen-after-approval>

## Code Map

- `src/lib/product-card-colors.ts` -- produce opciones únicas y separa las que tienen foto real.
- `src/lib/__tests__/product-card-colors.test.ts` -- protege la selección de una miniatura por color y los datos incompletos.
- `src/components/home/ProductCard.tsx` -- controla la vista previa, eventos de puntero/teclado/touch y galería horizontal.
- `src/components/shop/AnimatedProductGrid.tsx` -- continúa entregando el resumen derivado de variantes e imágenes.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/__tests__/product-card-colors.test.ts` -- agregar incrementalmente pruebas fallidas para `imageOptions` y ausencia de fotos etiquetadas.
- [x] `src/lib/product-card-colors.ts` -- exponer únicamente opciones de color respaldadas por una imagen real, preservando el total de variantes.
- [x] `src/components/home/ProductCard.tsx` -- sustituir swatches y `+N` por botones de miniatura desplazables que controlen `activeFrame`.
- [x] `src/components/home/ProductCard.tsx` -- aislar los eventos de miniatura del enlace superpuesto y de la secuencia 3D.

**Acceptance Criteria:**
- Given un modelo con fotos etiquetadas para varios colores, when aparece en cualquier catálogo, then todas las fotos representativas están disponibles como miniaturas sin círculos de color.
- Given una miniatura, when recibe hover, foco o clic/tap, then la imagen principal muestra ese color sin navegar a la ficha.
- Given que el puntero sale de la tarjeta, when finaliza la previsualización, then vuelve la primera imagen original.
- Given un producto sin `ProductImage.color`, when se renderiza, then no aparece una franja vacía ni un swatch de respaldo.
- Given una pantalla móvil estrecha, when hay más miniaturas que espacio, then se pueden recorrer horizontalmente sin tapar nombre, precio o botón.

## Spec Change Log

- 2026-07-29: Implementación completada. La revisión añadió restauración al abandonar la tarjeta con teclado, identidad activa por color y filtrado defensivo de URLs vacías o ajenas a los frames.

## Design Notes

La identidad de cada opción sigue siendo `normalizeColor(Variant.color)`. La miniatura se obtiene de la primera `ProductImage.color` equivalente y apunta a un frame ya incluido en la tarjeta. El estado activo es visual, no modifica la variante elegida ni el carrito.

Nike Air Force 1 actualmente solo tiene variantes “Blanco” y dos imágenes generales (`color = null`); por integridad de datos esta historia no inventará otros colores. La interacción aparecerá cuando sus variantes y fotos estén correctamente etiquetadas por color.

## Verification

**Commands:**
- `pnpm vitest run src/lib/__tests__/product-card-colors.test.ts` -- transformación verde tras cada ciclo TDD.
- `pnpm test` -- suite completa sin regresiones.
- `pnpm exec eslint src/components/home/ProductCard.tsx src/lib/product-card-colors.ts src/lib/__tests__/product-card-colors.test.ts` -- archivos tocados sin errores.
- `pnpm build` -- cliente, tipos e imágenes válidos en producción.

**Manual checks (if no CLI):**
- Probar hover, foco con Tab y tap en móvil con un producto de dos o más fotos etiquetadas; confirmar cambio de imagen, desplazamiento horizontal y navegación intacta.

**Result:** 165 pruebas pasan, ESLint sin errores y `pnpm build` compila correctamente. El catálogo actual confirma que los productos sin `ProductImage.color` no renderizan una franja vacía; la interacción completa requiere datos reales con fotos etiquetadas.
