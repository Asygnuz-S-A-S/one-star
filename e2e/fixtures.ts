import { test as base, expect, type Page } from "@playwright/test"

// Extiende el test base con un fixture de página autenticada como admin.
// Uso: test("mi test", async ({ adminPage }) => { ... })
export const test = base.extend<Record<never, never>, { adminPage: Page }>({
  adminPage: [async ({ browser }, provide) => {
    const email = process.env.TEST_ADMIN_EMAIL
    const password = process.env.TEST_ADMIN_PASSWORD

    if (!email || !password) {
      throw new Error(
        "Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD para usar el fixture adminPage"
      )
    }

    const context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    })
    const page = await context.newPage()

    try {
      await page.goto("/admin/login")
      await page.getByRole("textbox", { name: "Email", exact: true }).fill(email)
      await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(password)
      await page.getByRole("button", { name: /ingresar/i }).click()
      await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 10_000 })

      await provide(page)
    } finally {
      await context.close()
    }
  }, { scope: "worker" }],
})

export { expect }
