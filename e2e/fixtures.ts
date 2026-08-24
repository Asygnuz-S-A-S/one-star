import { test as base, expect, type Page } from "@playwright/test"

// Extiende el test base con un fixture de página autenticada como admin.
// Uso: test("mi test", async ({ adminPage }) => { ... })
export const test = base.extend<{ adminPage: Page }>({
  adminPage: async ({ page }, provide) => {
    const email = process.env.TEST_ADMIN_EMAIL
    const password = process.env.TEST_ADMIN_PASSWORD

    if (!email || !password) {
      throw new Error(
        "Configura TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD para usar el fixture adminPage"
      )
    }

    await page.goto("/admin/login")
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/contraseña/i).fill(password)
    await page.getByRole("button", { name: /ingresar/i }).click()
    await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 10_000 })

    await provide(page)
  },
})

export { expect }
