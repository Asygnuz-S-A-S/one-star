import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const repo = vi.hoisted(() => ({
  createAuthVerification: vi.fn(),
  deleteAuthVerification: vi.fn(),
  deleteAuthVerificationsByIdentifier: vi.fn(),
  findAuthVerificationByValue: vi.fn(),
  findCustomerByEmailInsensitive: vi.fn(),
  setUserPasswordHash: vi.fn(),
  deleteSessionsByUserEmail: vi.fn(),
  consumeRequestRateLimit: vi.fn(),
  sendCustomerPasswordResetEmail: vi.fn(),
}))

vi.mock("@/server/repositories/auth-verification.repository", () => repo)
vi.mock("@/server/repositories/user.repository", () => repo)
vi.mock("@/server/repositories/request-rate-limit.repository", () => repo)
vi.mock("@/server/services/email.service", () => repo)
vi.mock("@/server/services/admin-recovery.service", () => ({
  extractTrustedClientIp: () => "1.2.3.4",
  signResetToken: (raw: string) => `${raw}.sig`,
  verifySignedToken: (token: string) => token.endsWith(".sig"),
}))

import {
  CUSTOMER_RECOVERY_MESSAGE,
  requestCustomerPasswordReset,
  resetCustomerPasswordWithToken,
} from "../customer-recovery.service"

const customer = { id: "u1", email: "Ana@Mail.com", name: "Ana" }

beforeEach(() => {
  vi.clearAllMocks()
  repo.consumeRequestRateLimit.mockResolvedValue({ count: 1 })
})

describe("requestCustomerPasswordReset", () => {
  it("envía el enlace a un cliente existente con la respuesta neutra", async () => {
    repo.findCustomerByEmailInsensitive.mockResolvedValue(customer)

    const result = await requestCustomerPasswordReset(" ana@mail.com ", new Headers())

    expect(result).toEqual({ success: true, message: CUSTOMER_RECOVERY_MESSAGE })
    expect(repo.createAuthVerification).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "customer_password_reset:ana@mail.com" })
    )
    expect(repo.sendCustomerPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "Ana@Mail.com", resetUrl: expect.stringContaining("/restablecer-contrasena?token=") })
    )
  })

  it("responde lo mismo si el correo no existe, sin enviar nada", async () => {
    repo.findCustomerByEmailInsensitive.mockResolvedValue(null)

    const result = await requestCustomerPasswordReset("nadie@mail.com", new Headers())

    expect(result).toEqual({ success: true, message: CUSTOMER_RECOVERY_MESSAGE })
    expect(repo.sendCustomerPasswordResetEmail).not.toHaveBeenCalled()
  })

  it("corta por exceso de intentos", async () => {
    repo.consumeRequestRateLimit.mockResolvedValue({ count: 99 })

    const result = await requestCustomerPasswordReset("ana@mail.com", new Headers())

    expect(result.success).toBe(false)
    expect(repo.findCustomerByEmailInsensitive).not.toHaveBeenCalled()
  })
})

describe("resetCustomerPasswordWithToken", () => {
  const record = {
    id: "v1",
    identifier: "customer_password_reset:ana@mail.com",
    expiresAt: new Date(Date.now() + 60_000),
  }

  it("cambia la contraseña, consume el enlace y cierra sesiones", async () => {
    repo.findAuthVerificationByValue.mockResolvedValue(record)
    repo.findCustomerByEmailInsensitive.mockResolvedValue(customer)

    const result = await resetCustomerPasswordWithToken("abc.sig", "nueva-clave-1")

    expect(result).toEqual({ success: true })
    expect(repo.deleteAuthVerification).toHaveBeenCalledWith("v1")
    expect(repo.setUserPasswordHash).toHaveBeenCalledWith("u1", expect.stringMatching(/^\$2[aby]\$10\$/))
    expect(repo.deleteSessionsByUserEmail).toHaveBeenCalledWith("Ana@Mail.com")
  })

  it("rechaza enlaces de administrador, vencidos o con firma inválida", async () => {
    repo.findAuthVerificationByValue.mockResolvedValue({ ...record, identifier: "admin_password_reset:a@b.co" })
    expect((await resetCustomerPasswordWithToken("abc.sig", "nueva-clave-1")).success).toBe(false)

    repo.findAuthVerificationByValue.mockResolvedValue({ ...record, expiresAt: new Date(Date.now() - 1) })
    expect((await resetCustomerPasswordWithToken("abc.sig", "nueva-clave-1")).success).toBe(false)

    expect((await resetCustomerPasswordWithToken("abc.mala", "nueva-clave-1")).success).toBe(false)
    expect(repo.setUserPasswordHash).not.toHaveBeenCalled()
  })

  it("exige al menos 8 caracteres", async () => {
    repo.findAuthVerificationByValue.mockResolvedValue(record)
    const result = await resetCustomerPasswordWithToken("abc.sig", "corta")
    expect(result.success).toBe(false)
    expect(repo.setUserPasswordHash).not.toHaveBeenCalled()
  })
})
