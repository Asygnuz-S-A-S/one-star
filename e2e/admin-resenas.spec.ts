import { expect, test } from "./fixtures"

const adminEmail = process.env.TEST_ADMIN_EMAIL
const adminPassword = process.env.TEST_ADMIN_PASSWORD

test.describe("Reseñas — moderación, edición y destacadas", () => {
  test.skip(!adminEmail || !adminPassword, "Requiere TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD")

  test("una reseña de cliente queda pendiente, se puede editar, aprobar y destacar", async ({
    page,
    adminPage,
  }) => {
    test.setTimeout(90_000)
    const marker = `QA-${Date.now()}`

    // 1. El cliente escribe una reseña en la primera ficha del catálogo.
    await page.goto("/productos")
    const firstProduct = page.locator('a[href^="/productos/"]').first()
    await firstProduct.waitFor()
    const productPath = (await firstProduct.getAttribute("href"))!
    await page.goto(productPath)

    await page.getByRole("button", { name: /escribir reseña/i }).click()
    await page.getByPlaceholder("Tu nombre").fill(marker)
    await page.getByPlaceholder("Resume tu experiencia").fill("Prueba QA Inicial")
    await page.locator('textarea[name="body"]').fill(`Comentario de prueba ${marker}`)
    await page.getByRole("button", { name: /enviar reseña/i }).click()
    await expect(page.getByText(/la publicaremos en cuanto la revisemos/i)).toBeVisible()

    // 2. Sigue oculta para los visitantes.
    await page.reload()
    await expect(page.getByText(`Comentario de prueba ${marker}`)).toHaveCount(0)

    // 3. El admin la ve pendiente, la edita y la aprueba.
    await adminPage.goto("/admin/resenas")
    const row = adminPage.getByTestId("review-row").filter({ hasText: marker })
    await expect(row).toContainText("Pendiente")

    // Editar la reseña desde el panel
    await row.getByRole("button", { name: /editar/i }).click()
    await adminPage.locator('input[value="' + marker + '"]').fill(`${marker}-Editado`)
    await adminPage
      .locator('textarea')
      .filter({ hasText: `Comentario de prueba ${marker}` })
      .fill(`Comentario editado ${marker}`)
    await adminPage.getByRole("button", { name: /guardar cambios/i }).click()

    // Aprobar y publicar
    const updatedRow = adminPage.getByTestId("review-row").filter({ hasText: `${marker}-Editado` })
    await updatedRow.getByRole("button", { name: /aprobar y publicar/i }).click()
    await expect(updatedRow).toContainText("Publicada")

    // Destacar la reseña
    await updatedRow.getByRole("button", { name: /destacar/i }).click()
    await expect(updatedRow).toContainText("★ Destacada")

    // 4. Ya aparece editada en la ficha del producto.
    await page.goto(productPath)
    await expect(page.getByText(`Comentario editado ${marker}`)).toBeVisible()

    // 5. Limpieza: el admin la elimina.
    adminPage.once("dialog", (dialog) => dialog.accept())
    await updatedRow.getByRole("button", { name: /eliminar/i }).click()
    await expect(adminPage.getByTestId("review-row").filter({ hasText: marker })).toHaveCount(0)
  })
})
