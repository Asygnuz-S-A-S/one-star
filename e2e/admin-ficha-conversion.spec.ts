import { expect, test } from "./fixtures"

const adminEmail = process.env.TEST_ADMIN_EMAIL
const adminPassword = process.env.TEST_ADMIN_PASSWORD

test.describe("Admin — beneficios y preguntas frecuentes de la ficha", () => {
  test.skip(!adminEmail || !adminPassword, "Requiere TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD")

  test("lo que el admin escribe se guarda y se publica en la ficha", async ({ page, adminPage }) => {
    test.setTimeout(90_000)
    const marker = `QA${Date.now()}`

    await adminPage.goto("/admin/productos")
    const editHref = await adminPage.locator('a[href^="/admin/productos/c"]').first().getAttribute("href")
    await adminPage.goto(editHref!)

    const highlights = adminPage.getByPlaceholder(/Amortiguación suave/)
    const faqs = adminPage.getByPlaceholder(/¿Talla normal/)
    const originalHighlights = await highlights.inputValue()
    const originalFaqs = await faqs.inputValue()
    const slug = (await adminPage.locator('input[placeholder="air-max-90"]').inputValue()) || ""

    async function save() {
      await adminPage.getByRole("button", { name: /guardar cambios/i }).click()
      await expect(adminPage.getByText(/producto guardado correctamente/i)).toBeVisible()
    }

    await highlights.fill(`Beneficio ${marker}: detalle del beneficio`)
    await faqs.fill(`¿Pregunta ${marker}? | Respuesta ${marker}`)
    await save()

    // Se publica en la ficha pública, con título/detalle y como FAQ.
    await page.goto(`/productos/${slug}`)
    await expect(page.getByTestId("why-buy")).toContainText(`Beneficio ${marker}`)
    await expect(page.getByTestId("why-buy")).toContainText("detalle del beneficio")
    await expect(page.getByTestId("product-faq")).toContainText(`Respuesta ${marker}`)
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent()
    expect(ld).toContain("FAQPage")

    // Restaura lo que había antes.
    await adminPage.reload()
    await highlights.fill(originalHighlights)
    await faqs.fill(originalFaqs)
    await save()
  })
})
