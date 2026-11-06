import type { Page } from "@playwright/test"

/** El checkout con la bolsa vacía muestra "Tu bolsa está vacía": los tests del formulario necesitan un producto. */
// Igual a CART_STORAGE_VERSION de src/store/cart.store.ts.
const CART_STORAGE_VERSION = 1

export async function seedCart(page: Page) {
  await page.addInitScript((version) => {
    if (window.localStorage.getItem("onestar_cart")) return
    const item = {
      id: "e2e-variant", productId: "e2e-product", slug: "e2e-producto", name: "Producto E2E", brand: "One Star",
      imageUrl: null, size: "9", color: "Negro", price: 199900, originalPrice: 199900, quantity: 1, sku: "E2E-SKU",
    }
    window.localStorage.setItem("onestar_cart", JSON.stringify({ state: { items: [item], totalItems: 1, subtotal: item.price }, version }))
  }, CART_STORAGE_VERSION)
}

/** "Confirmar datos" se habilita solo con los términos aceptados. */
export async function acceptTerms(page: Page) {
  await page.getByRole("checkbox", { name: /acepto los términos/i }).check()
}
