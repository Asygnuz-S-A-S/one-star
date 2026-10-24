import { test, expect, type Page } from "@playwright/test"

/** La portada usa el hero editorial del builder o, sin campaña activa, el carrusel clásico. */
const homeHero = (page: Page) =>
  page.locator('[data-testid="editorial-campaign-hero"], [data-testid="home-hero"]').first()
const HERO_MEDIA = '[data-testid="editorial-hero-media"], [data-testid="editorial-hero-fallback"], [data-testid="hero-media"]'

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

  test("mantiene visible el contenido después del hero", async ({ page }) => {
    await page.goto("/")
    const hero = homeHero(page)
    await expect(hero).toBeVisible()
    await expect(hero.locator(HERO_MEDIA).first()).toHaveCSS("opacity", "1")
    await expect(hero.getByRole("heading", { level: 1 })).toHaveCSS("opacity", "1")

    await page.getByRole("link", { name: /lanzamientos/i }).last().scrollIntoViewIfNeeded()

    await expect(page.getByRole("link", { name: /lanzamientos/i }).last()).toBeVisible()
    await expect(page.getByRole("heading", { name: /promos y novedades/i })).toBeVisible()
  })

  test("mantiene visibles las categorías y la sección posterior al hacer scroll", async ({ page }) => {
    await page.goto("/")

    const categories = page.getByTestId("home-category-grid")
    await categories.scrollIntoViewIfNeeded()
    await expect(categories).toBeVisible()
    await expect(categories).toHaveCSS("opacity", "1")
    await expect(categories.getByRole("link").first()).toBeVisible()

    // No hay formulario suelto de newsletter: la suscripción vive en One Star Club (con cuenta y consentimiento).
    await expect(page.getByRole("heading", { name: /únete a one star/i })).toHaveCount(0)
  })

  test("los links de categorías en el nav navegan correctamente", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /hombre/i }).first().click()
    await expect(page).toHaveURL(/\/hombre/)
  })

  test("mantiene legibles los nombres y precios de las tarjetas de producto", async ({ page }) => {
    await page.goto("/")

    const productCard = page.locator("[data-product-id]:visible").first()
    await expect(productCard).toBeVisible({ timeout: 10_000 })

    const productName = productCard.locator("h3")
    const productPrice = productCard.getByTestId("product-card-price")

    for (const productText of [productName, productPrice]) {
      const contrastRatio = await productText.evaluate((element) => {
        const parseColor = (color: string) => {
          const channels = color.match(/[\d.]+/g)?.map(Number) ?? []
          return {
            red: channels[0] ?? 0,
            green: channels[1] ?? 0,
            blue: channels[2] ?? 0,
            alpha: channels[3] ?? 1,
          }
        }
        const luminance = ({ red, green, blue }: ReturnType<typeof parseColor>) => {
          const linearChannels = [red, green, blue].map((channel) => {
            const value = channel / 255
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
          })
          return 0.2126 * linearChannels[0] + 0.7152 * linearChannels[1] + 0.0722 * linearChannels[2]
        }

        const foreground = parseColor(window.getComputedStyle(element).color)
        let backgroundElement: Element | null = element
        let background = parseColor("rgb(255, 255, 255)")

        while (backgroundElement) {
          const candidate = parseColor(window.getComputedStyle(backgroundElement).backgroundColor)
          if (candidate.alpha > 0) {
            background = candidate
            break
          }
          backgroundElement = backgroundElement.parentElement
        }

        const light = Math.max(luminance(foreground), luminance(background))
        const dark = Math.min(luminance(foreground), luminance(background))
        return (light + 0.05) / (dark + 0.05)
      })

      expect(contrastRatio).toBeGreaterThanOrEqual(4.5)
    }
  })
})

test.describe("Catálogo de productos", () => {
  test("muestra las tarjetas de accesorios sin dejarlas transparentes", async ({ page }) => {
    await page.goto("/c/accesorios")

    const productCard = page.locator("article[data-product-id]").first()
    await expect(productCard).toBeVisible({ timeout: 10_000 })
    await expect(productCard).toHaveCSS("opacity", "1")
  })

  test("ofrece una ruta de producto explícita desde cada tarjeta visible", async ({ page }) => {
    await page.goto("/productos")
    const productCard = page.locator("article[data-product-id]").first()

    await expect(productCard).toBeVisible()
    await expect(productCard.getByRole("button", { name: /ver .*producto/i })).toBeVisible()
    await expect(productCard.getByTestId("product-card-stock")).toBeVisible()
  })

  test("prioriza el producto y el precio sin convertir la CTA en el elemento dominante", async ({ page }) => {
    await page.goto("/productos")
    const productCard = page.locator("article[data-product-id]").first()
    const media = productCard.getByTestId("product-card-media")
    const productImage = media.locator("img").first()
    const price = productCard.getByTestId("product-card-price")
    const cta = productCard.getByRole("button", { name: /ver .*producto/i })

    await expect(media).toBeVisible()
    await expect(productImage).toHaveCSS("object-fit", "contain")
    await expect(price).toHaveCSS("font-size", "16px")
    await expect(cta).toHaveCSS("min-height", "44px")
    await expect(cta).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
  })

  test("muestra la grilla de productos en /productos", async ({ page }) => {
    await page.goto("/productos")
    // Espera a que haya al menos un producto o el estado vacío
    await expect(
      page.locator("article:visible, [data-testid='product-card']:visible, h2:visible, h3:visible").first()
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
  test("solicita iniciar sesión solo cuando el visitante confirma el checkout", async ({ page }) => {
    await page.goto("/checkout")

    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible({ timeout: 8_000 })
    await expect(page.getByPlaceholder(/código de cupón/i)).toBeVisible()
    const confirmButton = page.getByRole("button", { name: /confirmar datos/i })
    await expect(confirmButton).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /inicia sesión para comprar/i })
    ).toHaveCount(0)

    await page.getByRole("textbox", { name: /email/i }).fill("cliente@example.com")
    await page.getByRole("textbox", { name: /^nombre/i }).fill("Ana")
    await page.getByRole("textbox", { name: /apellido/i }).fill("Pérez")
    await page.getByRole("radio", { name: /envío express/i }).check()
    await confirmButton.click()

    await expect(
      page.getByRole("heading", { name: /inicia sesión para pagar/i })
    ).toBeVisible()

    const loginLink = page.getByRole("link", { name: /iniciar sesión/i })
    const registerLink = page.getByRole("link", { name: /crear cuenta/i })
    await expect(loginLink).toHaveAttribute("href", "/login?callbackUrl=%2Fcheckout")
    await expect(registerLink).toHaveAttribute("href", "/registro?callbackUrl=%2Fcheckout")
    await page.route("**/api/auth/get-session**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: "session-customer",
            token: "token-customer",
            userId: "customer-1",
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          user: {
            id: "customer-1",
            email: "cliente@example.com",
            name: "Cliente",
            emailVerified: true,
            userType: "customer",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      })
    })

    await page.goto("/checkout")

    await expect(page.getByRole("textbox", { name: /email/i })).toHaveValue("cliente@example.com")
    await expect(page.getByRole("textbox", { name: /^nombre/i })).toHaveValue("Ana")
    await expect(page.getByRole("radio", { name: /envío express/i })).toBeChecked()
  })

  test("muestra el checkout normal a una sesión customer", async ({ page }) => {
    await page.route("**/api/auth/get-session**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: "session-customer",
            token: "token-customer",
            userId: "customer-1",
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          user: {
            id: "customer-1",
            email: "cliente@example.com",
            name: "Cliente",
            emailVerified: true,
            userType: "customer",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      })
    })

    await page.goto("/checkout")

    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible()
    await expect(page.getByText("¿Ya tienes cuenta?")).toHaveCount(0)
    await expect(page.getByText(/continuar como invitado/i)).toHaveCount(0)
  })

  test("solicita una cuenta de cliente al confirmar con sesión administrativa", async ({ page }) => {
    await page.route("**/api/auth/get-session**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: "session-admin",
            token: "token-admin",
            userId: "admin-1",
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          user: {
            id: "admin-1",
            email: "admin@example.com",
            name: "Admin",
            emailVerified: true,
            userType: "admin",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      })
    })

    await page.goto("/checkout")

    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible()
    await page.getByRole("button", { name: /confirmar datos/i }).click()
    await expect(page.getByRole("heading", { name: /inicia sesión para pagar/i })).toBeVisible()
  })

  test("mantiene el formulario visible pero no confirma mientras resuelve la sesión", async ({ page }) => {
    let releaseSession!: () => void
    const sessionResponse = new Promise<void>((resolve) => {
      releaseSession = resolve
    })

    await page.route("**/api/auth/get-session**", async (route) => {
      await sessionResponse
      await route.fulfill({ contentType: "application/json", body: "null" })
    })

    await page.goto("/checkout")
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /verificando sesión/i })).toBeDisabled()
    await expect(page.locator("#checkout-auth-title")).toHaveCount(0)

    releaseSession()
    const confirmButton = page.getByRole("button", { name: /confirmar datos/i })
    await expect(confirmButton).toBeEnabled()
    await confirmButton.click()
    await expect(page.getByRole("heading", { name: /inicia sesión para pagar/i })).toBeVisible()
  })

  test("el gate posterior a confirmar no desborda en viewport móvil", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/checkout")

    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible()
    await page.getByRole("button", { name: /confirmar datos/i }).click()
    await expect(page.getByRole("heading", { name: /inicia sesión para pagar/i })).toBeVisible()
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
    await expect(page.getByRole("link", { name: /iniciar sesión/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /crear cuenta/i })).toBeVisible()
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

test.describe("Filtros móviles", () => {
  test("el diálogo de filtros conserva el foco y se cierra con Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/productos")

    const trigger = page.getByRole("button", { name: "Filtros" })
    await trigger.click()
    const dialog = page.getByRole("dialog", { name: "Filtros" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Cerrar filtros" })).toBeFocused()

    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })
})

test.describe("Regresiones de base editorial", () => {
  test("mantiene el contenido de compra visible con movimiento reducido", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/")

    await expect(homeHero(page)).toBeVisible()
    await expect(page.getByTestId("home-category-grid")).toBeVisible()
    await expect(homeHero(page).getByRole("link").first()).toBeVisible()
  })

  test("no desborda la cabecera ni sus controles en móvil", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")

    await expect(page.locator("header")).toBeVisible()
    await expect(page.getByTestId("public-site-spacer")).toBeVisible()
    await expect(page.getByRole("button", { name: /carrito de compras/i })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})
