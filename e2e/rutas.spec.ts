import { test, expect } from "@playwright/test"

test.describe("Rutas que antes daban 404", () => {
  test("la búsqueda carga y filtra el catálogo por el término", async ({ page }) => {
    await page.goto("/buscar")

    const campo = page.getByRole("searchbox", { name: /buscar productos/i })
    await expect(campo).toBeVisible()

    await campo.fill("nike")
    await page.getByRole("search").getByRole("button", { name: /^buscar$/i }).click()

    await expect(page).toHaveURL(/\/buscar\?.*q=nike/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/nike/i)
  })

  test("la búsqueda conserva los filtros activos al lanzar un término nuevo", async ({ page }) => {
    await page.goto("/buscar?q=nike&marca=Nike")

    await page.getByRole("searchbox", { name: /buscar productos/i }).fill("air")
    await page.getByRole("search").getByRole("button", { name: /^buscar$/i }).click()

    await expect(page).toHaveURL(/marca=Nike/)
    await expect(page).toHaveURL(/q=air/)
  })

  for (const slug of ["hombre", "mujer", "ninos", "accesorios"]) {
    test(`/${slug} redirige a la categoría canónica /c/${slug}`, async ({ page }) => {
      const response = await page.goto(`/${slug}`)

      expect(response?.status()).toBe(200)
      await expect(page).toHaveURL(new RegExp(`/c/${slug}$`))
    })
  }

  test("términos y condiciones responde con su contenido legal", async ({ page }) => {
    const response = await page.goto("/terminos")

    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/términos y condiciones/i)
    await expect(page.getByRole("heading", { name: /derecho de retracto/i })).toBeVisible()
  })

  test("la política de privacidad responde con su contenido legal", async ({ page }) => {
    const response = await page.goto("/privacidad")

    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/política de privacidad/i)
    await expect(page.getByRole("heading", { name: /tus derechos como titular/i })).toBeVisible()
  })

  test("los enlaces legales del registro ya no llevan a un 404", async ({ page }) => {
    await page.goto("/registro")

    const response = await page.request.get("/terminos")
    expect(response.status()).toBe(200)

    const privacidad = await page.request.get("/privacidad")
    expect(privacidad.status()).toBe(200)
  })

  test("robots.txt apunta al sitemap y bloquea las rutas privadas", async ({ request }) => {
    const response = await request.get("/robots.txt")

    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain("Sitemap:")
    expect(body).toContain("/admin")
    expect(body).toContain("/checkout")
  })

  test("sitemap.xml lista las rutas públicas del catálogo", async ({ request }) => {
    const response = await request.get("/sitemap.xml")

    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain("<urlset")
    expect(body).toContain("/terminos")
    expect(body).toContain("/privacidad")
    expect(body).not.toContain("/admin")
  })
})

test.describe("Acceso a la búsqueda desde el header", () => {
  test("el ícono de búsqueda del escritorio lleva a /buscar", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/")

    await page.getByRole("link", { name: "Buscar", exact: true }).first().click()

    await expect(page).toHaveURL(/\/buscar$/)
  })
})

test.describe("Navegación por marca (HU-5)", () => {
  test("/marcas lista las marcas y lleva al catálogo filtrado sin usar el filtro lateral", async ({ page }) => {
    const response = await page.goto("/marcas")

    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { level: 1, name: /^marcas$/i })).toBeVisible()

    const primeraMarca = page.getByRole("link", { name: /producto/ }).first()
    const nombre = (await primeraMarca.textContent()) ?? ""
    await primeraMarca.click()

    await expect(page).toHaveURL(/\/marcas\/[a-z0-9-]+$/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText(nombre.split("·")[0].trim().slice(0, 4), { ignoreCase: true })
  })

  test("una marca inexistente responde 404", async ({ page }) => {
    const response = await page.goto("/marcas/marca-que-no-existe")

    expect(response?.status()).toBe(404)
  })
})

test.describe("Filtro de género (HU-8)", () => {
  test("el catálogo filtra por género desde el lateral y muestra el chip activo", async ({ page }) => {
    await page.goto("/productos")

    await page.getByRole("radio", { name: /^mujer$/i }).check()

    await expect(page).toHaveURL(/genero=mujer/)
    await expect(page.getByRole("link", { name: /Género: Mujer/ })).toBeVisible()
  })
})

test.describe("Filtros y orden en móvil (HU-9)", () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test("el catálogo ofrece filtros y orden desde el celular", async ({ page }) => {
    await page.goto("/productos")

    // El orden vive en la barra superior, sin abrir nada.
    const orden = page.getByLabel("Ordenar productos")
    await expect(orden).toBeVisible()
    await orden.selectOption("az")
    await expect(page).toHaveURL(/orden=az/)

    // Los filtros llegan por el panel desplegable.
    const abrir = page.getByRole("button", { name: "Filtros", exact: true })
    await expect(abrir).toBeVisible()
    await abrir.click()

    const panel = page.getByRole("heading", { name: "Filtros", exact: true })
    await expect(panel).toBeVisible()
    await page.locator("aside").getByRole("radio", { name: "Mujer", exact: true }).check()
    await expect(page).toHaveURL(/genero=mujer/)
    await expect(page).toHaveURL(/orden=az/)
  })
})

test.describe("Búsqueda en el menú superior (HU-10)", () => {
  for (const [nombre, viewport] of [
    ["escritorio", { width: 1280, height: 900 }],
    ["móvil", { width: 375, height: 812 }],
  ] as const) {
    test(`la lupa del menú abre la barra y busca en ${nombre}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto("/")

      const lupa = page.getByLabel("Buscar", { exact: true })
      await expect(lupa).toBeVisible()
      await lupa.click()

      const campo = page.locator("#header-search-q")
      await expect(campo).toBeFocused()
      await campo.fill("converse")
      await campo.press("Enter")

      await expect(page).toHaveURL(/\/buscar\?.*q=converse/)
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/converse/i)
    })
  }

  test("la barra se cierra con Escape", async ({ page }) => {
    await page.goto("/")

    await page.getByLabel("Buscar", { exact: true }).click()
    await expect(page.locator("#header-search-q")).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(page.locator("#header-search-q")).toHaveCount(0)
  })
})
