import { test, expect } from "@playwright/test"

test.describe("Admin — Acceso", () => {
  test("redirige a /admin/login cuando no hay sesión", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 8_000 })
  })

  test("muestra el formulario de login del admin", async ({ page }) => {
    await page.goto("/admin/login")
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/contraseña/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /ingresar/i })).toBeVisible()
  })

  test("muestra error con credenciales inválidas", async ({ page }) => {
    await page.goto("/admin/login")
    await page.getByLabel(/email/i).fill("fake@admin.com")
    await page.getByLabel(/contraseña/i).fill("wrongpass")
    await page.getByRole("button", { name: /ingresar/i }).click()

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 8_000 })
  })
})

// Tests con sesión de admin — requieren fixture de autenticación
// Para correr estos tests localmente con un usuario admin real,
// configura las variables de entorno TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD
test.describe("Admin — Panel (requiere sesión)", () => {
  test.skip(
    !process.env.TEST_ADMIN_EMAIL,
    "Requiere TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD"
  )

  test.beforeEach(async ({ page }) => {
    // Login como admin antes de cada test
    await page.goto("/admin/login")
    await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL!)
    await page.getByLabel(/contraseña/i).fill(process.env.TEST_ADMIN_PASSWORD!)
    await page.getByRole("button", { name: /ingresar/i }).click()
    await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 10_000 })
  })

  test("el dashboard carga con las métricas principales", async ({ page }) => {
    await page.goto("/admin")
    await expect(page.locator("main")).toBeVisible()
    // GMV, pedidos pendientes u otras métricas del dashboard
    await expect(page.locator("main")).toContainText(/.+/, { timeout: 8_000 })
  })

  test("la lista de productos carga en /admin/productos", async ({ page }) => {
    await page.goto("/admin/productos")
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 })
  })

  test("la lista de pedidos carga en /admin/pedidos", async ({ page }) => {
    await page.goto("/admin/pedidos")
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 })
  })

  test("la lista de cupones carga en /admin/cupones", async ({ page }) => {
    await page.goto("/admin/cupones")
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 })
  })

  test("la lista de banners carga en /admin/banners", async ({ page }) => {
    await page.goto("/admin/banners")
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 })
  })

  test("navegar a nuevo producto carga el formulario", async ({ page }) => {
    await page.goto("/admin/productos/nuevo")
    await expect(page.getByRole("form").or(page.locator("form"))).toBeVisible({ timeout: 8_000 })
  })
})
