import { describe, expect, it } from "vitest"
import { signInErrorMessage } from "@/lib/sign-in-error"

describe("signInErrorMessage", () => {
  it("muestra el límite de intentos en vez de credenciales incorrectas", () => {
    expect(signInErrorMessage({ status: 429 })).toBe(
      "Demasiados intentos. Intenta de nuevo en 15 minutos."
    )
  })

  it("muestra el código de Better Auth cuando la sesión falla", () => {
    const message = signInErrorMessage({ status: 401, code: "USER_NOT_FOUND" })
    expect(message).toContain("USER_NOT_FOUND")
    expect(message).not.toMatch(/incorrect/i)
  })

  it("usa el estado HTTP si no hay código", () => {
    expect(signInErrorMessage({ status: 500 })).toContain("HTTP 500")
  })

  it("no falla sin datos del error", () => {
    expect(signInErrorMessage(undefined)).toContain("SIN_CODIGO")
  })
})
