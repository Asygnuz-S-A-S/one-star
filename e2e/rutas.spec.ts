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
