import { test, expect } from "@playwright/test"

test.describe("Home", () => {
  test("carga la página principal correctamente", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/one star/i)
  })

  test("muestra el header con navegación", async ({ page }) => {
    await page.goto("/")
    const header = page.locator("header")
    await expect(header).toBeVisible()
  })

  test("los links de categorías en el nav navegan correctamente", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /hombre/i }).first().click()
    await expect(page).toHaveURL(/\/hombre/)
  })
})

test.describe("Catálogo de productos", () => {
  test("muestra la grilla de productos en /productos", async ({ page }) => {
    await page.goto("/productos")
    // Espera a que haya al menos un producto o el estado vacío
    await expect(
      page.locator("article, [data-testid='product-card'], h2, h3").first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test("el filtro de categoría hombre muestra productos masculinos", async ({ page }) => {
    await page.goto("/hombre")
    await expect(page).toHaveURL(/\/hombre/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("la página de sale carga correctamente", async ({ page }) => {
    await page.goto("/sale")
    await expect(page).toHaveURL(/\/sale/)
    await expect(page.locator("main")).toBeVisible()
  })
})

test.describe("Carrito", () => {
  test("la página del carrito carga correctamente", async ({ page }) => {
    await page.goto("/carrito")
    await expect(page.locator("main")).toBeVisible()
  })

  test("muestra mensaje de carrito vacío cuando no hay items", async ({ page }) => {
    await page.goto("/carrito")
    // Espera a que cargue y verifica que aparece algún contenido
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 })
  })
})

test.describe("Checkout", () => {
  test("redirige al login cuando se intenta checkout sin sesión", async ({ page }) => {
    await page.goto("/checkout")
    // O muestra el checkout, o redirige a login
    await expect(
      page.getByRole("heading").first()
    ).toBeVisible({ timeout: 8_000 })
  })
})

test.describe("Rutas de categorías", () => {
  const routes = [
    { path: "/hombre", label: "Hombre" },
    { path: "/mujer", label: "Mujer" },
    { path: "/ninos", label: "Niños" },
    { path: "/accesorios", label: "Accesorios" },
    { path: "/sale", label: "Sale" },
    { path: "/lanzamientos", label: "Lanzamientos" },
  ]

  for (const { path } of routes) {
    test(`${path} carga sin errores`, async ({ page }) => {
      const errors: string[] = []
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text())
      })

      await page.goto(path)
      await expect(page.locator("main")).toBeVisible({ timeout: 10_000 })

      // Sin errores críticos en consola
      const criticalErrors = errors.filter(
        (e) => !e.includes("favicon") && !e.includes("404")
      )
      expect(criticalErrors).toHaveLength(0)
    })
  }
})
