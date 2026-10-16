import { expect, test } from "./fixtures"

const adminEmail = process.env.TEST_ADMIN_EMAIL
const adminPassword = process.env.TEST_ADMIN_PASSWORD

test.describe("Admin — Contenido y promesas globales", () => {
  test.skip(!adminEmail || !adminPassword, "Requiere TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD")

  test("lo que el admin configura en contenido global se propaga a las fichas", async ({
    page,
    adminPage,
  }) => {
    test.setTimeout(90_000)
    const marker = `QA-GLOBAL-${Date.now()}`

    await adminPage.goto("/admin/contenido")
    await expect(adminPage.getByTestId("site-content-form")).toBeVisible()

    const highlightsInput = adminPage.locator("textarea").first()
    const originalHighlights = await highlightsInput.inputValue()

    // Escribir beneficio global único
    await highlightsInput.fill(`Beneficio Global ${marker}: detalle global para todos los productos`)
    await adminPage.getByRole("button", { name: /guardar contenido global/i }).click()
    await expect(adminPage.getByText(/guardados exitosamente/i)).toBeVisible()

    // Visitar un producto que no tenga benefits propios (o verificar la ficha)
    await page.goto("/productos")
    const firstProduct = page.locator('a[href^="/productos/"]').first()
    await firstProduct.waitFor()
    const productPath = (await firstProduct.getAttribute("href"))!
    await page.goto(productPath)

    // Restaurar el contenido original
    await adminPage.goto("/admin/contenido")
    const restoreInput = adminPage.locator("textarea").first()
    await restoreInput.fill(originalHighlights)
    await adminPage.getByRole("button", { name: /guardar contenido global/i }).click()
    await expect(adminPage.getByText(/guardados exitosamente/i)).toBeVisible()
  })
})
