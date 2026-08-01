import { test, expect } from "@playwright/test"
import { PrismaClient } from "@prisma/client"
import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

async function deleteTestCustomer(email: string) {
  const prisma = new PrismaClient()
  try {
    await prisma.authUser.deleteMany({ where: { email } })
    await prisma.user.deleteMany({ where: { email } })
  } finally {
    await prisma.$disconnect()
  }
}

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("muestra el formulario de login correctamente", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible()
    await expect(page.getByLabel(/correo electrónico/i)).toBeVisible()
    await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: /ingresar/i })).toBeVisible()
  })

  test("muestra error con credenciales incorrectas", async ({ page }) => {
    await page.getByLabel(/correo electrónico/i).fill("noexiste@test.com")
    await page.getByLabel("Contraseña", { exact: true }).fill("wrongpassword")
    await page.getByRole("button", { name: /ingresar/i }).click()

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 8_000 })
  })

  test("el botón muestra 'Ingresando...' mientras carga", async ({ page }) => {
    await page.getByLabel(/correo electrónico/i).fill("test@test.com")
    await page.getByLabel("Contraseña", { exact: true }).fill("pass1234")

    const submitBtn = page.getByRole("button", { name: /ingresar/i })
    await submitBtn.click()

    await expect(submitBtn).toHaveText(/ingresando/i, { timeout: 3_000 })
  })

  test("toggle de contraseña cambia el tipo del input", async ({ page }) => {
    const passwordInput = page.getByLabel("Contraseña", { exact: true })
    await expect(passwordInput).toHaveAttribute("type", "password")

    await page.getByRole("button", { name: /mostrar contraseña/i }).click()
    await expect(passwordInput).toHaveAttribute("type", "text")

    await page.getByRole("button", { name: /ocultar contraseña/i }).click()
    await expect(passwordInput).toHaveAttribute("type", "password")
  })

  test("el link 'Regístrate' navega a /registro", async ({ page }) => {
    await page.getByRole("link", { name: /regístrate/i }).click()
    await expect(page).toHaveURL(/\/registro/)
  })

  test("conserva un callback interno al navegar al registro", async ({ page }) => {
    await page.goto("/login?callbackUrl=%2Fcheckout")

    await page.getByRole("link", { name: /regístrate/i }).click()

    await expect(page).toHaveURL(/\/registro\?callbackUrl=%2Fcheckout$/)
  })

  test("descarta un callback externo al enlazar al registro", async ({ page }) => {
    await page.goto("/login?callbackUrl=https%3A%2F%2Fevil.example%2Fsteal")

    await expect(page.getByRole("link", { name: /regístrate/i })).toHaveAttribute(
      "href",
      "/registro?callbackUrl=%2Fcuenta"
    )
  })
})

test.describe("Registro", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/registro")
  })

  test("muestra el formulario de registro con todos sus campos", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /crear cuenta/i })).toBeVisible()
    await expect(page.getByLabel(/nombre/i)).toBeVisible()
    await expect(page.getByLabel(/apellido/i)).toBeVisible()
    await expect(page.getByLabel(/cédula/i)).toBeVisible()
    await expect(page.getByLabel(/teléfono/i)).toBeVisible()
    await expect(page.getByLabel(/correo electrónico/i)).toBeVisible()
  })

  test("mantiene legibles los campos al activar el tema oscuro", async ({ page }) => {
    await page.getByRole("button", { name: /cambiar tema/i }).click()

    const nameInput = page.getByLabel("Nombre")
    await nameInput.fill("Ana")

    await expect(nameInput).toHaveCSS("background-color", "rgb(30, 30, 30)")
    await expect(nameInput).toHaveCSS("color", "rgb(240, 240, 242)")
  })

  test("mantiene legibles los mensajes de validación en tema oscuro", async ({ page }) => {
    await page.getByRole("button", { name: /cambiar tema/i }).click()
    await page.getByRole("button", { name: /crear cuenta/i }).click()

    await expect(page.getByText(/el nombre es requerido/i)).toHaveCSS(
      "color",
      "rgb(255, 115, 119)",
    )
  })

  test("muestra errores de validación al enviar vacío", async ({ page }) => {
    await page.getByRole("button", { name: /crear cuenta/i }).click()

    await expect(page.getByText(/el nombre es requerido/i)).toBeVisible()
    await expect(page.getByText(/el apellido es requerido/i)).toBeVisible()
    await expect(page.getByText(/debes aceptar los términos/i)).toBeVisible()
  })

  test("valida que las contraseñas coincidan", async ({ page }) => {
    await page.getByLabel("Nombre").fill("Juan")
    await page.getByLabel("Apellido").fill("Pérez")
    await page.getByLabel("Cédula").fill("123456789")
    await page.getByLabel("Teléfono").fill("3001234567")
    await page.getByLabel("Fecha de nacimiento").fill("1990-01-01")
    await page.getByLabel(/correo electrónico/i).fill("juan@test.com")
    await page.getByLabel("Contraseña", { exact: true }).fill("password123")
    await page.getByLabel("Confirmar contraseña").fill("different456")

    await page.getByRole("button", { name: /crear cuenta/i }).click()

    await expect(page.getByText(/las contraseñas no coinciden/i)).toBeVisible()
  })

  test("el link 'Inicia sesión' navega a /login", async ({ page }) => {
    await page.getByRole("link", { name: /inicia sesión/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test("conserva un callback interno al volver al login", async ({ page }) => {
    await page.goto("/registro?callbackUrl=%2Fcheckout")

    await page.getByRole("link", { name: /inicia sesión/i }).click()

    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fcheckout$/)
  })

  test("prellena el registro desde checkout sin consumir el borrador", async ({ page }) => {
    await page.goto("/checkout")
    const confirmButton = page.getByRole("button", { name: /confirmar datos/i })
    await expect(confirmButton).toBeEnabled()

    await page.getByRole("textbox", { name: /email/i }).fill("cliente@example.com")
    await page.getByRole("checkbox", { name: /recibir novedades/i }).check()
    await page.getByRole("textbox", { name: /^nombre/i }).fill("Ana")
    await page.getByRole("textbox", { name: /apellido/i }).fill("Pérez")
    await page.getByRole("textbox", { name: /teléfono/i }).fill("3001234567")
    await page.getByRole("textbox", { name: /dirección/i }).fill("Calle 1 # 2-3")
    await page.getByRole("radio", { name: /envío express/i }).check()
    await confirmButton.click()

    const savedDraft = await page.evaluate(() =>
      window.sessionStorage.getItem("onestar_checkout_draft"),
    )
    expect(savedDraft).not.toBeNull()

    await page.getByRole("link", { name: /crear cuenta/i }).click()

    await expect(page).toHaveURL(/\/registro\?callbackUrl=%2Fcheckout$/)
    expect(
      await page.evaluate(() => window.sessionStorage.getItem("onestar_checkout_draft")),
    ).toBe(savedDraft)
    await expect(page.getByLabel("Nombre")).toHaveValue("Ana")
    await expect(page.getByLabel("Apellido")).toHaveValue("Pérez")
    await expect(page.getByLabel("Teléfono")).toHaveValue("3001234567")
    await expect(page.getByLabel(/correo electrónico/i)).toHaveValue("cliente@example.com")
    await expect(page.getByRole("checkbox", { name: /quiero recibir ofertas/i })).toBeChecked()
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("")
    await expect(page.getByLabel("Cédula")).toHaveValue("")

    const storedDraft = await page.evaluate(() =>
      window.sessionStorage.getItem("onestar_checkout_draft"),
    )
    expect(storedDraft).toContain("Calle 1 # 2-3")
    expect(storedDraft).toContain('"shippingMethod":"express"')
  })

  test("no prellena un registro directo aunque exista un borrador de checkout", async ({ page }) => {
    await page.goto("/checkout")
    const confirmButton = page.getByRole("button", { name: /confirmar datos/i })
    await expect(confirmButton).toBeEnabled()

    await page.getByRole("textbox", { name: /email/i }).fill("cliente@example.com")
    await page.getByRole("textbox", { name: /^nombre/i }).fill("Ana")
    await page.getByRole("textbox", { name: /apellido/i }).fill("Pérez")
    await confirmButton.click()

    const savedDraft = await page.evaluate(() =>
      window.sessionStorage.getItem("onestar_checkout_draft"),
    )
    expect(savedDraft).not.toBeNull()

    await page.goto("/registro")

    await expect(page.getByLabel("Nombre")).toHaveValue("")
    await expect(page.getByLabel("Apellido")).toHaveValue("")
    await expect(page.getByLabel("Teléfono")).toHaveValue("")
    await expect(page.getByLabel(/correo electrónico/i)).toHaveValue("")
    await expect(page.getByRole("checkbox", { name: /quiero recibir ofertas/i })).not.toBeChecked()
    expect(
      await page.evaluate(() => window.sessionStorage.getItem("onestar_checkout_draft")),
    ).toBe(savedDraft)
  })

  test("registro y login exitosos regresan al checkout", async ({ page }) => {
    test.setTimeout(30_000)
    const unique = `${Date.now()}-${test.info().workerIndex}`
    const email = `checkout-e2e-${unique}@example.com`
    const password = "Checkout123!"

    try {
      await page.goto("/registro?callbackUrl=%2Fcheckout")
      await page.getByLabel("Nombre").fill("Cliente")
      await page.getByLabel("Apellido").fill("Checkout")
      await page.getByLabel("Cédula").fill(Date.now().toString().slice(-9))
      await page.getByLabel("Teléfono").fill("3001234567")
      await page.getByLabel("Fecha de nacimiento").fill("1990-01-01")
      await page.getByLabel(/correo electrónico/i).fill(email)
      await page.getByLabel("Contraseña", { exact: true }).fill(password)
      await page.getByLabel("Confirmar contraseña").fill(password)
      await page.getByLabel("Marca de preferencia").selectOption("Sin preferencia")
      await page.getByLabel("Hombre").check()
      await page.getByLabel(/acepto los términos/i).check()
      await page.getByRole("button", { name: /crear cuenta/i }).click()

      await expect(page).toHaveURL(/\/checkout$/, { timeout: 12_000 })
      await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible()
      await expect(page.getByText(/continuar como invitado/i)).toHaveCount(0)

      await page.context().clearCookies()
      await page.goto("/login?callbackUrl=%2Fcheckout")
      await page.getByLabel(/correo electrónico/i).fill(email)
      await page.getByLabel("Contraseña", { exact: true }).fill(password)
      await page.getByRole("button", { name: /ingresar/i }).click()

      await expect(page).toHaveURL(/\/checkout$/, { timeout: 12_000 })
      await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible()
    } finally {
      await deleteTestCustomer(email)
    }
  })
})
