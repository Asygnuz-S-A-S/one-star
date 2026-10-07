import { expect, test } from "./fixtures"

const adminEmail = process.env.TEST_ADMIN_EMAIL
const adminPassword = process.env.TEST_ADMIN_PASSWORD

test.describe("Página de marca y administración de contenido de marca", () => {
  test.skip(!adminEmail || !adminPassword, "Requiere TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD")

  test("editar contenido de marca en el admin se refleja en la página de marca y en su SEO", async ({
    page,
    adminPage,
  }) => {
    test.setTimeout(90_000)
    const marker = `QA-MARCA-${Date.now()}`

    // 1. Ir a /admin/marcas y editar la primera marca
    await adminPage.goto("/admin/marcas")
    const editBtn = adminPage.getByRole("button", { name: "Editar" }).first()
    await editBtn.waitFor()
    await editBtn.click()

    const storyInput = adminPage.getByPlaceholder(/Explica la historia de la marca/i)
    const originalStory = await storyInput.inputValue()
    const brandName = await adminPage.locator('input[required]').inputValue()

    await storyInput.fill(`Historia de prueba ${marker} con filosofía de marca.`)
    await adminPage.getByRole("button", { name: /guardar cambios/i }).click()

    // 2. Visitar la página pública de la marca
    await page.goto("/marcas")
    const brandCard = page.locator('a[href^="/marcas/"]').first()
    await brandCard.waitFor()
    const brandSlug = (await brandCard.getAttribute("href"))!
    await page.goto(brandSlug)

    // Verificar contenido renderizado
    await expect(page.locator("h1")).toContainText(brandName)
    await expect(page.getByText(`Historia de prueba ${marker}`)).toBeVisible()

    // Verificar JSON-LD estructurado
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent()
    expect(ld).toContain("CollectionPage")
    expect(ld).toContain("Brand")
    expect(ld).not.toContain("aggregateRating")

    // 3. Restaurar la historia original
    await adminPage.goto("/admin/marcas")
    const editRestore = adminPage.getByRole("button", { name: "Editar" }).first()
    await editRestore.click()
    const storyRestore = adminPage.getByPlaceholder(/Explica la historia de la marca/i)
    await storyRestore.fill(originalStory)
    await adminPage.getByRole("button", { name: /guardar cambios/i }).click()
  })
})
