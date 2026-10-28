import { expect, test } from "@playwright/test"

/** Abre la primera ficha disponible del catálogo, sin depender de un slug concreto. */
async function openFirstProduct(page: import("@playwright/test").Page) {
  await page.goto("/productos")
  const firstProduct = page.locator('a[href^="/productos/"]').first()
  await firstProduct.waitFor()
  const href = await firstProduct.getAttribute("href")
  await page.goto(href!)
}

test.describe("Ficha de producto — SEO y conversión", () => {
  test("tiene un solo H1, canonical limpio y datos estructurados válidos", async ({ page }) => {
    await openFirstProduct(page)

    await expect(page.locator("h1")).toHaveCount(1)
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href")
    expect(canonical).toMatch(/\/productos\/[^/?]+$/)

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(blocks.length).toBeGreaterThan(0)
    const graph = JSON.parse(blocks[0])["@graph"] as { "@type": string }[]
    const types = graph.map((node) => node["@type"])
    expect(types).toEqual(expect.arrayContaining(["Product", "BreadcrumbList"]))
  })

  test("muestra garantías junto al botón y la sección de cierre", async ({ page }) => {
    await openFirstProduct(page)

    await expect(page.getByTestId("product-trust")).toBeVisible()
    await expect(page.getByTestId("closing-cta")).toBeVisible()
  })

  test("en móvil la barra de compra aparece al bajar y pide la talla si falta", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await openFirstProduct(page)

    const bar = page.getByTestId("sticky-buy-bar")

    // Con el botón principal a la vista, la barra no estorba.
    await page.locator("#comprar").scrollIntoViewIfNeeded()
    await expect(bar).toHaveAttribute("aria-hidden", "true")

    // Al pasar de largo el botón, la barra queda fija con precio y acción.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(bar).toHaveAttribute("aria-hidden", "false")

    await bar.getByRole("button", { name: /elige tu talla/i }).click()
    await expect(page.getByText("Selecciona una talla")).toBeVisible()
  })

  test("mantiene título, precio y compra perceptibles sin revelar contenido con Motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await openFirstProduct(page)

    await expect(page.locator("h1")).toBeVisible()
    await expect(page.locator("#comprar")).toBeVisible()
    await expect(page.locator("#comprar").getByRole("button").first()).toBeVisible()
  })

  test("presenta disponibilidad y compra explícita antes del contenido editorial", async ({ page }) => {
    await openFirstProduct(page)

    await expect(page.locator("h1")).toBeVisible()
    await expect(page.getByTestId("product-availability")).toBeVisible()
    await expect(page.locator("#comprar").getByRole("button", { name: /agregar a la bolsa/i })).toBeVisible()
  })

  test("mantiene la compra rápida separada del acceso al chat en móvil", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await openFirstProduct(page)

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const sticky = page.getByTestId("sticky-buy-bar")
    const chat = page.getByRole("button", { name: /abrir chat de ventas/i })
    await expect(sticky).toHaveAttribute("aria-hidden", "false")
    await expect(chat).toBeVisible()

    const [stickyBox, chatBox] = await Promise.all([sticky.boundingBox(), chat.boundingBox()])
    expect(stickyBox).not.toBeNull()
    expect(chatBox).not.toBeNull()
    expect(chatBox!.y + chatBox!.height).toBeLessThanOrEqual(stickyBox!.y)
  })

  test("con una talla válida conserva el flujo de agregar al carrito", async ({ page }) => {
    await openFirstProduct(page)

    await page.locator('#selector-talla button[aria-label^="Talla"]:not([disabled])').first().click()
    await page.locator("#comprar").getByRole("button", { name: /agregar a la bolsa/i }).click()

    await expect(page.getByRole("dialog", { name: /^bolsa$/i })).toBeVisible()
    await expect(page.getByRole("dialog", { name: /^bolsa$/i }).getByText("Talla:")).toBeVisible()
  })
})
