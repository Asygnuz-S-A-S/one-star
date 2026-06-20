import { test as base, expect } from "@playwright/test"

// Extiende el test base con fixtures de autenticación reutilizables
export const test = base.extend<{
  adminPage: ReturnType<typeof base>["extend"] extends never ? never : Awaited<ReturnType<typeof base["extend"]>>
}>({
  // Fixture: página con sesión de admin ya iniciada
  // Uso: test("mi test", ({ adminPage }) => { ... })
  adminPage: async ({ page }, use) => {
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

    await use(page as never)
  },
})

export { expect }
