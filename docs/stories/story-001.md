# Story 001 — Ficha de Producto con Galería y Selección de Variante

**Epic:** Epic 1 — Catálogo y Productos  
**Prioridad:** P0 (bloqueante para carrito y checkout)  
**Estado:** En progreso — página `/productos/[slug]` existe pero incompleta  
**Story points:** 8

---

## User Story

**Como** comprador que llega a la tienda desde un enlace de redes sociales o búsqueda,  
**quiero** ver la galería completa del producto, elegir mi talla y color, y agregar al carrito desde la misma página,  
**para** completar el flujo de compra en el mínimo de pasos posibles.

---

## Contexto Técnico

El archivo `src/app/productos/[slug]/page.tsx` ya existe. El modelo `Product` tiene `ProductImage[]`, `Variant[]` (size, color, sizeUS, sizeCM, sizeEUR, stock) y `crossSells`. El store de carrito está en `src/store/cart.store.ts` con Zustand.

**Archivos relevantes:**
- `src/app/productos/[slug]/page.tsx`
- `src/server/repositories/product.repository.ts`
- `src/server/services/product.service.ts`
- `src/store/cart.store.ts`
- `src/components/cart/CartDrawer.tsx`

---

## Criterios de Aceptación

### Galería de imágenes
- **Dado** que el producto tiene imágenes,  
  **cuando** la ficha carga,  
  **entonces** se muestran ordenadas por `position` ASC, mínimo 5 fotos visibles en galería horizontal (swipeable en móvil).
- La imagen principal cambia al tocar/clicar una miniatura.
- Si el producto tiene `videoUrl`, aparece como última opción de la galería, reproduciendo en loop sin sonido.

### Selección de variante
- **Dado** que el usuario selecciona una talla,  
  **cuando** esa talla solo está disponible en ciertos colores,  
  **entonces** los colores sin stock para esa talla aparecen deshabilitados (tachados).
- **Dado** que la variante seleccionada tiene `stock = 0`,  
  **entonces** el botón "Agregar al carrito" se deshabilita y muestra "Agotado".

### Agregar al carrito
- **Dado** que el usuario ha seleccionado talla y color,  
  **cuando** pulsa "Agregar al carrito",  
  **entonces** el `CartDrawer` se abre con el ítem añadido y el stock de esa variante disminuye en la vista (optimistic update).
- El botón muestra un spinner durante la acción y vuelve a su estado normal al completarse.

### Guía de tallas
- Un botón/link "Guía de tallas" abre un modal con tabla de equivalencias US/CM/EUR.
- El modal es dismissable con Escape o clic fuera.

### Cross-sell
- Si el producto tiene `crossSells`, se muestra la sección "Completa tu look" debajo del botón de carrito con mínimo 2 y máximo 4 productos sugeridos.

### SEO
- La página exporta `generateMetadata` usando `metaTitle` y `metaDescription` del producto.
- Incluye JSON-LD con `@type: Product`, `name`, `image`, `offers` (price, priceCurrency: "COP", availability).

---

## Tareas de Implementación

- [ ] Implementar galería swipeable con soporte de video en `ProductGallery.tsx`
- [ ] Implementar selector de variante (`VariantSelector.tsx`) con lógica de deshabilitar combinaciones sin stock
- [ ] Conectar "Agregar al carrito" al `cart.store.ts` (optimistic) y a `cart.repository.ts` si usuario autenticado
- [ ] Implementar modal de guía de tallas `SizeGuideModal.tsx`
- [ ] Renderizar sección de cross-sells desde `product.crossSells`
- [ ] Agregar `generateMetadata` y JSON-LD a la page
- [ ] Tests unitarios en `product.service.ts` — getBySlug con variantes e imágenes

---

## Definición de Done

- [ ] Galería funciona con swipe en móvil (Chrome/Safari iOS)
- [ ] Variantes con stock 0 correctamente deshabilitadas
- [ ] Agregar al carrito funciona para usuario invitado y autenticado
- [ ] JSON-LD pasa validación en Google Rich Results Test
- [ ] Tests en service con cobertura ≥ 80 %
- [ ] No hay layout shifts (CLS = 0) en la galería al cargar imágenes
