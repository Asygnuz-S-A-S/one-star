import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

import bcrypt from "bcryptjs"
import {
  requestAdminPasswordReset,
  verifyAdminPasswordResetToken,
  resetAdminPasswordWithToken,
  changeAdminOwnPassword,
  signResetToken,
  RECOVERY_SUCCESS_MESSAGE,
} from "../admin-recovery.service"

const mockFindAdminByEmail = vi.fn()
const mockFindAdminById = vi.fn()
const mockSetAdminUserPassword = vi.fn()
const mockDeleteAdminSessionsByEmail = vi.fn()
const mockSyncAuthAccountPassword = vi.fn()

vi.mock("@/server/repositories/admin.repository", () => ({
  findAdminByEmail: (...args: unknown[]) => mockFindAdminByEmail(...args),
  findAdminById: (...args: unknown[]) => mockFindAdminById(...args),
  setAdminUserPassword: (...args: unknown[]) => mockSetAdminUserPassword(...args),
  deleteAdminSessionsByEmail: (...args: unknown[]) => mockDeleteAdminSessionsByEmail(...args),
  syncAuthAccountPassword: (...args: unknown[]) => mockSyncAuthAccountPassword(...args),
}))

const mockCreateAuthVerification = vi.fn()
const mockFindAuthVerificationByValue = vi.fn()
const mockDeleteAuthVerification = vi.fn()
const mockDeleteAuthVerificationsByIdentifier = vi.fn()

vi.mock("@/server/repositories/auth-verification.repository", () => ({
  createAuthVerification: (...args: unknown[]) => mockCreateAuthVerification(...args),
  findAuthVerificationByValue: (...args: unknown[]) => mockFindAuthVerificationByValue(...args),
  deleteAuthVerification: (...args: unknown[]) => mockDeleteAuthVerification(...args),
  deleteAuthVerificationsByIdentifier: (...args: unknown[]) => mockDeleteAuthVerificationsByIdentifier(...args),
}))

const mockConsumeRequestRateLimit = vi.fn()

vi.mock("@/server/repositories/request-rate-limit.repository", () => ({
  consumeRequestRateLimit: (...args: unknown[]) => mockConsumeRequestRateLimit(...args),
}))

const mockSendAdminPasswordResetEmail = vi.fn()

vi.mock("@/server/services/email.service", () => ({
  sendAdminPasswordResetEmail: (...args: unknown[]) => mockSendAdminPasswordResetEmail(...args),
}))

vi.mock("@/server/services/admin-role.service", () => ({
  invalidateAdminRoleCache: vi.fn(),
}))

describe("admin-recovery.service", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "secreto-de-prueba")
    vi.clearAllMocks()
    mockConsumeRequestRateLimit.mockResolvedValue({ count: 1, resetAt: new Date(Date.now() + 60000) })
    mockSendAdminPasswordResetEmail.mockResolvedValue({ success: true })
    mockDeleteAdminSessionsByEmail.mockResolvedValue(1)
  })

  describe("requestAdminPasswordReset", () => {
    it("devuelve respuesta neutra y envía correo cuando el administrador existe y está activo", async () => {
      mockFindAdminByEmail.mockResolvedValue({
        id: "admin-1",
        email: "admin@onestar.com",
        name: "Admin One",
        isActive: true,
      })

      const headers = new Headers({ "x-real-ip": "190.25.10.5" })
      const res = await requestAdminPasswordReset("admin@onestar.com", headers)

      expect(res.success).toBe(true)
      expect(res.message).toBe(RECOVERY_SUCCESS_MESSAGE)
      expect(mockDeleteAuthVerificationsByIdentifier).toHaveBeenCalledWith(
        "admin_password_reset:admin@onestar.com"
      )
      expect(mockCreateAuthVerification).toHaveBeenCalledTimes(1)
      expect(mockSendAdminPasswordResetEmail).toHaveBeenCalledTimes(1)
      expect(mockSendAdminPasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "admin@onestar.com",
          name: "Admin One",
          resetUrl: expect.stringContaining("/admin/restablecer-contrasena?token="),
        })
      )
    })

    it("devuelve exactamente la misma respuesta neutra sin enviar correo si el correo NO existe", async () => {
      mockFindAdminByEmail.mockResolvedValue(null)

      const headers = new Headers({ "x-real-ip": "190.25.10.5" })
      const res = await requestAdminPasswordReset("desconocido@onestar.com", headers)

      expect(res.success).toBe(true)
      expect(res.message).toBe(RECOVERY_SUCCESS_MESSAGE)
      expect(mockCreateAuthVerification).not.toHaveBeenCalled()
      expect(mockSendAdminPasswordResetEmail).not.toHaveBeenCalled()
    })

    it("devuelve respuesta neutra sin enviar correo si el administrador está inactivo", async () => {
      mockFindAdminByEmail.mockResolvedValue({
        id: "admin-2",
        email: "inactivo@onestar.com",
        name: "Admin Inactivo",
        isActive: false,
      })

      const headers = new Headers()
      const res = await requestAdminPasswordReset("inactivo@onestar.com", headers)

      expect(res.success).toBe(true)
      expect(res.message).toBe(RECOVERY_SUCCESS_MESSAGE)
      expect(mockCreateAuthVerification).not.toHaveBeenCalled()
      expect(mockSendAdminPasswordResetEmail).not.toHaveBeenCalled()
    })

    it("bloquea por límite de intentos por IP", async () => {
      mockConsumeRequestRateLimit.mockResolvedValueOnce({ count: 6, resetAt: new Date() })

      const headers = new Headers({ "x-real-ip": "1.2.3.4" })
      const res = await requestAdminPasswordReset("admin@onestar.com", headers)

      expect(res.success).toBe(false)
      expect(res.error).toContain("Demasiados intentos")
      expect(mockFindAdminByEmail).not.toHaveBeenCalled()
    })

    it("bloquea por límite de intentos por correo", async () => {
      mockConsumeRequestRateLimit
        .mockResolvedValueOnce({ count: 1, resetAt: new Date() }) // IP ok
        .mockResolvedValueOnce({ count: 4, resetAt: new Date() }) // Email rate limit exceeded

      const headers = new Headers({ "x-real-ip": "1.2.3.4" })
      const res = await requestAdminPasswordReset("admin@onestar.com", headers)

      expect(res.success).toBe(false)
      expect(res.error).toContain("Demasiados intentos")
      expect(mockFindAdminByEmail).not.toHaveBeenCalled()
    })
  })

  it("no firma enlaces si falta AUTH_SECRET (sin secreto por defecto en el repositorio)", () => {
    vi.stubEnv("AUTH_SECRET", "")
    expect(() => signResetToken("abc")).toThrow("AUTH_SECRET no está configurado.")
  })

  describe("verifyAdminPasswordResetToken", () => {
    it("valida un token firmado, existente y vigente", async () => {
      const raw = "1234567890abcdef1234567890abcdef"
      const token = signResetToken(raw)

      mockFindAuthVerificationByValue.mockResolvedValue({
        id: "verif-1",
        identifier: "admin_password_reset:admin@onestar.com",
        value: token,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      })

      const res = await verifyAdminPasswordResetToken(token)
      expect(res.valid).toBe(true)
      expect(res.email).toBe("admin@onestar.com")
    })

    it("rechaza token alterado en su firma HMAC", async () => {
      const res = await verifyAdminPasswordResetToken("rawtoken.badsignature")
      expect(res.valid).toBe(false)
      expect(res.error).toContain("inválido o ha sido modificado")
    })

    it("rechaza token que no existe o ya fue consumido", async () => {
      const raw = "1234567890abcdef1234567890abcdef"
      const token = signResetToken(raw)

      mockFindAuthVerificationByValue.mockResolvedValue(null)

      const res = await verifyAdminPasswordResetToken(token)
      expect(res.valid).toBe(false)
      expect(res.error).toContain("ya ha sido utilizado")
    })

    it("rechaza token expirado", async () => {
      const raw = "1234567890abcdef1234567890abcdef"
      const token = signResetToken(raw)

      mockFindAuthVerificationByValue.mockResolvedValue({
        id: "verif-1",
        identifier: "admin_password_reset:admin@onestar.com",
        value: token,
        expiresAt: new Date(Date.now() - 1000), // Vencido
      })

      const res = await verifyAdminPasswordResetToken(token)
      expect(res.valid).toBe(false)
      expect(res.error).toContain("ha expirado")
    })
  })

  describe("resetAdminPasswordWithToken", () => {
    it("restablece contraseña con token válido, consume el token y cierra sesiones", async () => {
      const raw = "1234567890abcdef1234567890abcdef"
      const token = signResetToken(raw)

      mockFindAuthVerificationByValue.mockResolvedValue({
        id: "verif-1",
        identifier: "admin_password_reset:admin@onestar.com",
        value: token,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      })

      mockFindAdminByEmail.mockResolvedValue({
        id: "admin-1",
        email: "admin@onestar.com",
        name: "Admin One",
        isActive: true,
      })

      const res = await resetAdminPasswordWithToken(token, "nuevaContrasena123")

      expect(res.success).toBe(true)
      expect(mockDeleteAuthVerification).toHaveBeenCalledWith("verif-1")
      expect(mockSetAdminUserPassword).toHaveBeenCalledWith("admin-1", expect.any(String))
      expect(mockSyncAuthAccountPassword).toHaveBeenCalledWith("admin@onestar.com", expect.any(String))
      expect(mockDeleteAdminSessionsByEmail).toHaveBeenCalledWith("admin@onestar.com")
    })

    it("rechaza token reutilizado (un solo uso)", async () => {
      const raw = "1234567890abcdef1234567890abcdef"
      const token = signResetToken(raw)

      // Primera verificación pasa, pero al consumir ya no existe en DB
      mockFindAuthVerificationByValue
        .mockResolvedValueOnce({
          id: "verif-1",
          identifier: "admin_password_reset:admin@onestar.com",
          value: token,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        })
        .mockResolvedValueOnce(null)

      mockFindAdminByEmail.mockResolvedValue({
        id: "admin-1",
        email: "admin@onestar.com",
        name: "Admin One",
        isActive: true,
      })

      const res = await resetAdminPasswordWithToken(token, "nuevaContrasena123")
      expect(res.success).toBe(false)
      expect(res.error).toContain("ya ha sido utilizado")
    })

    it("rechaza contraseñas de menos de 10 caracteres", async () => {
      const raw = "1234567890abcdef1234567890abcdef"
      const token = signResetToken(raw)

      mockFindAuthVerificationByValue.mockResolvedValue({
        id: "verif-1",
        identifier: "admin_password_reset:admin@onestar.com",
        value: token,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      })

      const res = await resetAdminPasswordWithToken(token, "corta9ch")
      expect(res.success).toBe(false)
      expect(res.error).toContain("al menos 10 caracteres")
      expect(mockSetAdminUserPassword).not.toHaveBeenCalled()
    })
  })

  describe("changeAdminOwnPassword", () => {
    it("falla si la contraseña actual es incorrecta", async () => {
      const currentHash = bcrypt.hashSync("correcta12345", 10)
      mockFindAdminById.mockResolvedValue({
        id: "admin-1",
        email: "admin@onestar.com",
        passwordHash: currentHash,
        isActive: true,
      })

      const res = await changeAdminOwnPassword("admin-1", "incorrecta123", "nuevaSuperClave10")
      expect(res.success).toBe(false)
      expect(res.error).toBe("La contraseña actual es incorrecta.")
      expect(mockSetAdminUserPassword).not.toHaveBeenCalled()
      expect(mockDeleteAdminSessionsByEmail).not.toHaveBeenCalled()
    })

    it("actualiza la contraseña y cierra las demás sesiones cuando la actual es correcta", async () => {
      const currentHash = bcrypt.hashSync("correcta12345", 10)
      mockFindAdminById.mockResolvedValue({
        id: "admin-1",
        email: "admin@onestar.com",
        passwordHash: currentHash,
        isActive: true,
      })

      const res = await changeAdminOwnPassword(
        "admin-1",
        "correcta12345",
        "nuevaSuperClave10",
        "session-current-id"
      )

      expect(res.success).toBe(true)
      expect(mockSetAdminUserPassword).toHaveBeenCalledWith("admin-1", expect.any(String))
      expect(mockSyncAuthAccountPassword).toHaveBeenCalledWith("admin@onestar.com", expect.any(String))
      expect(mockDeleteAdminSessionsByEmail).toHaveBeenCalledWith("admin@onestar.com", "session-current-id")
    })

    it("falla si el usuario administrador no existe o está inactivo", async () => {
      mockFindAdminById.mockResolvedValue(null)

      const res = await changeAdminOwnPassword("no-existe", "cualquiera", "nuevaSuperClave10")
      expect(res.success).toBe(false)
      expect(res.error).toContain("no encontrado")
    })
  })
})
