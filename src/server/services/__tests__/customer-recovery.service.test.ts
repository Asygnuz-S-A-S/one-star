import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({
  createAuthVerification: vi.fn(),
  deleteAuthVerification: vi.fn(),
  deleteAuthVerificationsByIdentifier: vi.fn(),
  findAuthVerificationByValue: vi.fn(),
  deleteAdminSessionsByEmail: vi.fn().mockResolvedValue(2),
  syncAuthAccountPassword: vi.fn(),
  findUserByEmail: vi.fn(),
  updateUser: vi.fn(),
  consumeRequestRateLimit: vi.fn(),
  sendCustomerPasswordResetEmail: vi.fn(),
}))
vi.mock("@/server/repositories/auth-verification.repository", () => ({
  createAuthVerification: m.createAuthVerification,
  deleteAuthVerification: m.deleteAuthVerification,
  deleteAuthVerificationsByIdentifier: m.deleteAuthVerificationsByIdentifier,
  findAuthVerificationByValue: m.findAuthVerificationByValue,
}))
vi.mock("@/server/repositories/admin.repository", () => ({
  deleteAdminSessionsByEmail: m.deleteAdminSessionsByEmail,
  syncAuthAccountPassword: m.syncAuthAccountPassword,
  findAdminByEmail: vi.fn(),
  findAdminById: vi.fn(),
  setAdminUserPassword: vi.fn(),
}))
vi.mock("@/server/repositories/user.repository", () => ({ findUserByEmail: m.findUserByEmail, updateUser: m.updateUser }))
vi.mock("@/server/repositories/request-rate-limit.repository", () => ({ consumeRequestRateLimit: m.consumeRequestRateLimit }))
vi.mock("@/server/services/email.service", () => ({
  sendCustomerPasswordResetEmail: m.sendCustomerPasswordResetEmail,
  sendAdminPasswordResetEmail: vi.fn(),
}))
vi.mock("@/server/services/admin-role.service", () => ({ invalidateAdminRoleCache: vi.fn() }))

import bcrypt from "bcryptjs"
import {
  CUSTOMER_RECOVERY_MESSAGE,
  requestCustomerPasswordReset,
  resetCustomerPasswordWithToken,
  verifyCustomerPasswordResetToken,
} from "../customer-recovery.service"
import { signResetToken } from "../admin-recovery.service"

const headers = new Headers({ "x-real-ip": "203.0.113.5" })
const user = { id: "u1", email: "ana@x.co", name: "Ana" }

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("AUTH_SECRET", "secreto-de-pruebas")
  m.consumeRequestRateLimit.mockResolvedValue({ count: 1, resetAt: new Date() })
})

describe("requestCustomerPasswordReset", () => {
  it("con cuenta: guarda un enlace de 1 hora y lo envía; responde el mensaje neutro", async () => {
    m.findUserByEmail.mockResolvedValue(user)
    const res = await requestCustomerPasswordReset(" Ana@X.co ", headers)

    expect(res).toEqual({ success: true, message: CUSTOMER_RECOVERY_MESSAGE })
    expect(m.deleteAuthVerificationsByIdentifier).toHaveBeenCalledWith("customer_password_reset:ana@x.co")
    const saved = m.createAuthVerification.mock.calls[0][0]
    expect(saved.identifier).toBe("customer_password_reset:ana@x.co")
    expect(saved.expiresAt.getTime() - Date.now()).toBeGreaterThan(59 * 60 * 1000)
    expect(m.sendCustomerPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@x.co", resetUrl: expect.stringContaining("/restablecer-contrasena?token=") })
    )
  })

  it("sin cuenta: misma respuesta y no envía nada (no revela si el correo existe)", async () => {
    m.findUserByEmail.mockResolvedValue(null)
    const res = await requestCustomerPasswordReset("nadie@x.co", headers)
    expect(res).toEqual({ success: true, message: CUSTOMER_RECOVERY_MESSAGE })
    expect(m.sendCustomerPasswordResetEmail).not.toHaveBeenCalled()
  })

  it("si falla el envío, la respuesta sigue siendo la neutra", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    m.findUserByEmail.mockResolvedValue(user)
    m.sendCustomerPasswordResetEmail.mockRejectedValueOnce(new Error("resend caído"))
    expect(await requestCustomerPasswordReset("ana@x.co", headers)).toEqual({ success: true, message: CUSTOMER_RECOVERY_MESSAGE })
  })

  it("corta tras 3 intentos por correo", async () => {
    m.consumeRequestRateLimit.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 4 })
    const res = await requestCustomerPasswordReset("ana@x.co", headers)
    expect(res.success).toBe(false)
    expect(m.findUserByEmail).not.toHaveBeenCalled()
  })
})

describe("reset con enlace", () => {
  const token = () => signResetToken("raw-token")
  const record = (identifier: string, minutes = 30) => ({
    id: "v1",
    identifier,
    value: token(),
    expiresAt: new Date(Date.now() + minutes * 60 * 1000),
  })

  it("un enlace de administrador no sirve para clientes", async () => {
    m.findAuthVerificationByValue.mockResolvedValue(record("admin_password_reset:ana@x.co"))
    expect((await verifyCustomerPasswordResetToken(token())).valid).toBe(false)
  })

  it("rechaza enlaces vencidos o con la firma alterada", async () => {
    m.findAuthVerificationByValue.mockResolvedValue(record("customer_password_reset:ana@x.co", -1))
    expect((await verifyCustomerPasswordResetToken(token())).valid).toBe(false)
    expect((await verifyCustomerPasswordResetToken(`${token()}x`)).valid).toBe(false)
  })

  it("cambia la clave en la cuenta y en better-auth, consume el enlace y cierra sesiones", async () => {
    m.findAuthVerificationByValue.mockResolvedValue(record("customer_password_reset:ana@x.co"))
    m.findUserByEmail.mockResolvedValue(user)

    expect(await resetCustomerPasswordWithToken(token(), "nuevaClave1")).toEqual({ success: true })

    expect(m.deleteAuthVerification).toHaveBeenCalledWith("v1")
    const hash = m.updateUser.mock.calls[0][1].passwordHash as string
    expect(bcrypt.compareSync("nuevaClave1", hash)).toBe(true)
    expect(m.syncAuthAccountPassword).toHaveBeenCalledWith("ana@x.co", hash)
    expect(m.deleteAdminSessionsByEmail).toHaveBeenCalledWith("ana@x.co")
  })

  it("no acepta claves cortas", async () => {
    m.findAuthVerificationByValue.mockResolvedValue(record("customer_password_reset:ana@x.co"))
    expect((await resetCustomerPasswordWithToken(token(), "corta")).success).toBe(false)
    expect(m.updateUser).not.toHaveBeenCalled()
  })
})
