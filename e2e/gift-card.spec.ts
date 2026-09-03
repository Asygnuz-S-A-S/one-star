import { test, expect } from "@playwright/test"

interface StoredCartItem {
  id: string
  productId: string
  name: string
  price: number
  sku: string
}

async function readCart(page: import("@playwright/test").Page): Promise<StoredCartItem[]> {
  const raw = await page.evaluate(() => window.localStorage.getItem("onestar_cart"))
  if (!raw) return []
  const parsed = JSON.parse(raw) as { state?: { items?: StoredCartItem[] } }
  return parsed.state?.items ?? []
}

test.describe("Tarjeta de regalo", () => {
  test("ofrece los montos publicados en el catálogo", async ({ page }) => {
    await page.goto("/tarjeta-regalo")

    const grupo = page.getByRole("group", { name: /monto de la tarjeta de regalo/i })
    await expect(grupo).toBeVisible()
    await expect(grupo.getByRole("button")).toHaveCount(5)
  })

  test("añade la tarjeta al carrito con la variante real, no con un id ficticio", async ({
    page,
  }) => {
    await page.goto("/tarjeta-regalo")

    await page
      .getByRole("group", { name: /monto de la tarjeta de regalo/i })
      .getByRole("button", { name: /100\.000/ })
      .click()

    await page.getByRole("button", { name: /añadir .* al carrito/i }).click()

    await expect(page.getByText("Tarjeta de Regalo $100.000").first()).toBeVisible()

    const items = await readCart(page)
    expect(items).toHaveLength(1)
    expect(items[0].sku).toBe("GIFT-CARD-100000")
    expect(items[0].price).toBe(100_000)
    // El id del ítem es el variantId que el checkout usa para tasar el pedido.
    expect(items[0].id.startsWith("gift-card-")).toBe(false)
    expect(items[0].productId.startsWith("gift-card-")).toBe(false)
  })

  test("la tarjeta sobrevive a la página del carrito con su precio", async ({ page }) => {
    await page.goto("/tarjeta-regalo")
    await page.getByRole("button", { name: /añadir .* al carrito/i }).click()
    await expect(page.getByText(/tarjeta de regalo \$/i).first()).toBeVisible()

    await page.goto("/carrito")

    await expect(page.getByText(/tarjeta de regalo \$/i).first()).toBeVisible()
    const items = await readCart(page)
    expect(items).toHaveLength(1)
    expect(items[0].price).toBeGreaterThan(0)
  })

  test("descarta del carrito las tarjetas guardadas con el formato antiguo", async ({ page }) => {
    await page.goto("/")

    await page.evaluate(() => {
      window.localStorage.setItem(
        "onestar_cart",
        JSON.stringify({
          state: {
            items: [
              {
                id: "gift-card-100000",
                productId: "gift-card-100000",
                kind: "gift_card",
                slug: "tarjeta-regalo",
                name: "Tarjeta de Regalo $100.000",
                brand: "One Star",
                imageUrl: null,
                size: "Digital",
                color: "Rojo One Star",
                price: 100000,
                originalPrice: 100000,
                quantity: 1,
                sku: "GIFT-CARD-100000",
              },
            ],
            totalItems: 1,
            subtotal: 100000,
          },
          version: 0,
        })
      )
    })

    await page.goto("/carrito")
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem("onestar_cart")
      if (!raw) return false
      return (JSON.parse(raw) as { version?: number }).version === 1
    })

    expect(await readCart(page)).toHaveLength(0)
  })
})
