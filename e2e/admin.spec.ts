import { test, expect } from "./fixtures"

test.describe("Admin — Acceso", () => {
  test("redirige a /admin/login cuando no hay sesión", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 8_000 })
  })

  test("muestra el formulario de login del admin", async ({ page }) => {
    await page.goto("/admin/login")
    await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeVisible()
    await expect(page.getByRole("textbox", { name: "Contraseña", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: /ingresar/i })).toBeVisible()
    await expect(page.getByRole("banner")).toHaveCount(0)
    await expect(page.getByTestId("public-site-spacer")).toHaveCount(0)
    await expect(page.getByRole("main")).toHaveCount(1)
  })

  test("muestra error con credenciales inválidas", async ({ page }) => {
    await page.goto("/admin/login")
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("fake@admin.com")
    await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill("wrongpass")
    await page.getByRole("button", { name: /ingresar/i }).click()

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 8_000 })
  })

  test("conserva chrome y landmark principal en la tienda pública", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("banner")).toHaveCount(1)
    await expect(page.getByRole("navigation", { name: "Menú principal", exact: true })).toHaveCount(1)
    await expect(page.getByRole("button", { name: "Carrito de compras", exact: true })).toBeVisible()
    await expect(page.getByTestId("public-site-spacer")).toBeVisible()
    await expect(page.getByRole("main")).toHaveCount(1)
  })

})

// Tests con sesión de admin — requieren fixture de autenticación
// Para correr estos tests localmente con un usuario admin real,
// configura las variables de entorno TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD
test.describe("Admin — Panel (requiere sesión)", () => {
  test.describe.configure({ mode: "serial" })

  test.skip(
    !process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD,
    "Requiere TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD"
  )

  test.afterEach(async ({ adminPage }) => {
    await adminPage.waitForTimeout(2_500)
  })

  test("el dashboard carga con las métricas principales", async ({ adminPage: page }) => {
    await page.goto("/admin")
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible()
    await expect(page.getByText("GMV Total", { exact: true })).toBeVisible()
    await expect(page.getByText("Pedidos Pendientes", { exact: true })).toBeVisible()
  })

  test("la lista de productos carga en /admin/productos", async ({ adminPage: page }) => {
    await page.goto("/admin/productos")
    await expect(page.getByRole("heading", { name: /^Productos/ })).toBeVisible({ timeout: 8_000 })
  })

  test("la lista de pedidos carga en /admin/pedidos", async ({ adminPage: page }) => {
    await page.goto("/admin/pedidos")
    await expect(page.getByRole("heading", { name: /^Pedidos/ })).toBeVisible({ timeout: 8_000 })
  })

  test("la lista de cupones carga en /admin/cupones", async ({ adminPage: page }) => {
    await page.goto("/admin/cupones")
    await expect(page.getByRole("heading", { name: /^Cupones/ })).toBeVisible({ timeout: 8_000 })
  })

  test("la ruta de banners abre el Landing Builder", async ({ adminPage: page }) => {
    await page.goto("/admin/banners")
    await expect(page).toHaveURL(/\/admin\/landing-builder$/)
    await expect(page.getByRole("heading", { name: "Constructor Visual", exact: true })).toBeVisible()
  })

  test("navegar a nuevo producto carga el editor", async ({ adminPage: page }) => {
    await page.goto("/admin/productos/nuevo")
    await expect(page.getByRole("heading", { name: "Nuevo producto", exact: true })).toBeVisible({
      timeout: 8_000,
    })
    await expect(page.getByRole("button", { name: "Crear producto", exact: true })).toBeVisible()
  })
})
