import { expect, test } from "./fixtures"

const adminEmail = process.env.TEST_ADMIN_EMAIL
const adminPassword = process.env.TEST_ADMIN_PASSWORD

test.describe("Admin — auditoría E2E integral", () => {
  test.describe.configure({ mode: "serial" })

  test.skip(
    !adminEmail || !adminPassword,
    "Requiere TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD",
  )

  test("recorre todas las áreas principales sin errores de ejecución", async ({ adminPage: page }) => {
    test.setTimeout(120_000)
    const runtimeErrors: string[] = []
    const capturePageError = (error: Error) => runtimeErrors.push(error.message)
    const captureConsoleError = (message: { type(): string; text(): string }) => {
      if (message.type() === "error") runtimeErrors.push(message.text())
    }

    page.on("pageerror", capturePageError)
    page.on("console", captureConsoleError)

    const routes: Array<{ path: string; heading: RegExp }> = [
      { path: "/admin", heading: /^Dashboard$/ },
      { path: "/admin/pedidos", heading: /^Pedidos/ },
      { path: "/admin/clientes", heading: /^Clientes/ },
      { path: "/admin/clientes/abandonados", heading: /^Carritos abandonados/ },
      { path: "/admin/cupones", heading: /^Cupones/ },
      { path: "/admin/productos", heading: /^Productos/ },
      { path: "/admin/productos/nuevo", heading: /^Nuevo producto$/ },
      { path: "/admin/categorias", heading: /^Gestor de Categorías/ },
      { path: "/admin/marcas", heading: /^Catálogo de Marcas$/ },
      { path: "/admin/colores", heading: /^Colores de producto$/ },
      { path: "/admin/landing-builder", heading: /^Constructor Visual$/ },
      { path: "/admin/tiendas", heading: /^Gestor de Sucursales Físicas$/ },
      { path: "/admin/configuracion", heading: /^Configuración$/ },
      { path: "/admin/integraciones", heading: /^Integraciones$/ },
    ]

    for (const route of routes) {
      await page.goto(route.path)
      await expect(page).not.toHaveURL(/\/admin\/login/)
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible({
        timeout: 10_000,
      })
      await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toBeVisible()
      await expect(page.getByRole("banner")).toHaveCount(0)
      await expect(page.getByTestId("public-site-spacer")).toHaveCount(0)
      await expect(page.getByRole("main")).toHaveCount(1)
      await page.waitForTimeout(2_500)
    }

    page.off("pageerror", capturePageError)
    page.off("console", captureConsoleError)
    expect(runtimeErrors).toEqual([])
  })

  test("mantiene las rutas visuales antiguas centralizadas en Landing Builder", async ({ adminPage: page }) => {
    for (const legacyRoute of [
      "/admin/banner",
      "/admin/banners",
      "/admin/grilla",
      "/admin/logos",
      "/admin/navegacion",
    ]) {
      await page.goto(legacyRoute)
      await expect(page).toHaveURL(/\/admin\/landing-builder$/)
      await expect(page.getByRole("heading", { name: "Constructor Visual", exact: true })).toBeVisible()
      await page.waitForTimeout(2_500)
    }
  })

  test("crea, edita y elimina una categoría aislada de prueba", async ({ adminPage: page }) => {
    test.setTimeout(60_000)
    const timestamp = Date.now()
    const categoryName = `E2E QA ${timestamp}`
    const updatedName = `${categoryName} Editada`
    const categorySlug = `e2e-qa-${timestamp}`

    await page.goto("/admin/categorias")

    try {
      await page.getByPlaceholder("Ej. Zapatos Rojos", { exact: true }).fill(categoryName)
      await expect(page.getByPlaceholder("zapatos-rojos", { exact: true })).toHaveValue(categorySlug)
      await page.getByRole("button", { name: "Guardar", exact: true }).click()

      let categoryRow = page.getByRole("row").filter({ hasText: categorySlug })
      await expect(categoryRow).toContainText(categoryName)

      await categoryRow.getByRole("button", { name: "Editar", exact: true }).click()
      await page.getByPlaceholder("Ej. Zapatos Rojos", { exact: true }).fill(updatedName)
      await page.getByRole("button", { name: "Guardar", exact: true }).click()

      categoryRow = page.getByRole("row").filter({ hasText: categorySlug })
      await expect(categoryRow).toContainText(updatedName)

      page.once("dialog", (dialog) => dialog.accept())
      await categoryRow.getByRole("button", { name: "Eliminar", exact: true }).click()
      await expect(page.getByRole("row").filter({ hasText: categorySlug })).toHaveCount(0)
    } finally {
      await page.goto("/admin/categorias")
      const leftoverRow = page.getByRole("row").filter({ hasText: categorySlug })
      if (await leftoverRow.count()) {
        page.once("dialog", (dialog) => dialog.accept())
        await leftoverRow.getByRole("button", { name: "Eliminar", exact: true }).click()
        await expect(leftoverRow).toHaveCount(0)
      }
    }
  })

  test("expone controles coherentes de alta y configuración", async ({ adminPage: page }) => {
    test.setTimeout(60_000)

    await page.goto("/admin/cupones")
    await page.getByRole("button", { name: "+ Crear cupón", exact: true }).click()
    await expect(page.getByPlaceholder("VERANO20", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Cancelar", exact: true }).click()
    await page.waitForTimeout(2_500)

    await page.goto("/admin/marcas")
    await page.getByRole("button", { name: "+ Nueva Marca", exact: true }).click()
    await expect(page.getByPlaceholder("Nike", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Cancelar", exact: true }).click()
    await page.waitForTimeout(2_500)

    await page.goto("/admin/colores")
    await expect(page.getByRole("heading", { name: "Agregar color", exact: true })).toBeVisible()
    await expect(page.getByPlaceholder("Ej. Verde Militar", { exact: true })).toBeVisible()
    await page.waitForTimeout(2_500)

    await page.goto("/admin/productos/nuevo")
    await expect(page.getByPlaceholder("Ej. Air Max 90", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Crear producto", exact: true })).toBeVisible()
    await page.waitForTimeout(2_500)

    await page.goto("/admin/tiendas")
    await expect(page.getByRole("heading", { name: "Nueva Sucursal", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Guardar Sucursal", exact: true })).toBeVisible()
    await page.waitForTimeout(2_500)

    await page.goto("/admin/configuracion")
    await expect(page.getByPlaceholder("One Star", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeVisible()
  })

  test("integra Landing Builder con su previsualización pública", async ({ adminPage: page }) => {
    await page.goto("/admin/landing-builder")

    await expect(page.getByText("Hero Banner (Principal)", { exact: true })).toBeVisible()
    await expect(page.getByText("Explora One Star", { exact: true })).toBeVisible()
    await expect(page.getByText("Sé parte de One Star", { exact: true })).toBeVisible()

    const preview = page.frameLocator('iframe[title="Live Preview"]')
    await expect(preview.getByRole("heading", { name: "NUEVA ERA", exact: true })).toBeVisible()
    await expect(preview.getByRole("heading", { name: "Explora One Star", exact: true })).toBeVisible()
    await expect(preview.getByRole("heading", { name: "Sé parte de One Star", exact: true })).toBeVisible()
  })

  test("muestra navegación administrativa utilizable en móvil", async ({ adminPage: page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/admin")

    const menuButton = page.getByRole("button", { name: "Abrir menú", exact: true })
    await expect(menuButton).toHaveCount(1)
    await expect(menuButton).toBeVisible()
    await menuButton.click()
    await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Landing Builder", exact: true })).toBeVisible()
    await expect(page.getByRole("banner")).toHaveCount(0)
    await expect(page.getByTestId("public-site-spacer")).toHaveCount(0)
    await expect(page.getByRole("main")).toHaveCount(1)
  })

  test("conserva chrome y landmark principal en la tienda pública", async ({ adminPage: page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto("/")

    await expect(page.getByRole("banner")).toHaveCount(1)
    await expect(page.getByRole("navigation", { name: "Menú principal", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Carrito de compras", exact: true })).toBeVisible()
    await expect(page.getByTestId("public-site-spacer")).toBeVisible()
    await expect(page.getByRole("main")).toHaveCount(1)
  })

  test("expone el diagnóstico ERP sin ejecutar sincronizaciones", async ({ adminPage: page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto("/admin/integraciones")

    await expect(page.getByRole("heading", { name: "Programación automática", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Probar endpoints", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Sincronizar catálogo", exact: true })).toBeVisible()
    await expect(page.getByRole("table")).toBeVisible()
  })
})
