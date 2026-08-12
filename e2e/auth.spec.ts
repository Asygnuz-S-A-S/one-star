import { test, expect } from "@playwright/test"

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("muestra el formulario de login correctamente", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible()
    await expect(page.getByLabel(/correo electrónico/i)).toBeVisible()
    await expect(page.getByLabel(/contraseña/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /ingresar/i })).toBeVisible()
  })

  test("muestra error con credenciales incorrectas", async ({ page }) => {
    await page.getByLabel(/correo electrónico/i).fill("noexiste@test.com")
    await page.getByLabel(/contraseña/i).fill("wrongpassword")
    await page.getByRole("button", { name: /ingresar/i }).click()

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 8_000 })
  })

  test("el botón muestra 'Ingresando...' mientras carga", async ({ page }) => {
    await page.getByLabel(/correo electrónico/i).fill("test@test.com")
    await page.getByLabel(/contraseña/i).fill("pass1234")

    const submitBtn = page.getByRole("button", { name: /ingresar/i })
    await submitBtn.click()

    await expect(submitBtn).toHaveText(/ingresando/i, { timeout: 3_000 })
  })

  test("toggle de contraseña cambia el tipo del input", async ({ page }) => {
    const passwordInput = page.getByLabel(/contraseña/i)
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
})
