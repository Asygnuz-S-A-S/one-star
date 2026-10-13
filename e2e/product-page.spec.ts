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
})
