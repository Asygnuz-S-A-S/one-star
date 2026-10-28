import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

import {
  requestAdminPasswordResetAction,
  resetAdminPasswordWithTokenAction,
  changeAdminOwnPasswordAction,
} from "../admin-recovery.actions"

const mockRequireAdmin = vi.fn()
vi.mock("@/server/auth/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}))

const mockRequestReset = vi.fn()
const mockResetWithToken = vi.fn()
const mockChangeOwnPassword = vi.fn()

vi.mock("@/server/services/admin-recovery.service", () => ({
  requestAdminPasswordReset: (...args: unknown[]) => mockRequestReset(...args),
  resetAdminPasswordWithToken: (...args: unknown[]) => mockResetWithToken(...args),
  changeAdminOwnPassword: (...args: unknown[]) => mockChangeOwnPassword(...args),
}))

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers({ "x-real-ip": "1.2.3.4" })),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

describe("admin-recovery.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("requestAdminPasswordResetAction", () => {
    it("procesa correo válido y devuelve respuesta neutra", async () => {
      mockRequestReset.mockResolvedValue({
        success: true,
        message: "Si el correo corresponde a un administrador activo...",
      })

      const fd = new FormData()
      fd.set("email", "admin@onestar.com")

      const res = await requestAdminPasswordResetAction(null, fd)
      expect(res.success).toBe(true)
      expect(res.message).toContain("administrador activo")
      expect(mockRequestReset).toHaveBeenCalledWith("admin@onestar.com", expect.any(Headers))
    })

    it("falla con error si el formato del correo es inválido", async () => {
      const fd = new FormData()
      fd.set("email", "invalido")

      const res = await requestAdminPasswordResetAction(null, fd)
      expect(res.success).toBe(false)
      expect(res.error).toBeDefined()
      expect(mockRequestReset).not.toHaveBeenCalled()
    })
  })

  describe("resetAdminPasswordWithTokenAction", () => {
    it("falla si las contraseñas no coinciden", async () => {
      const fd = new FormData()
      fd.set("token", "valido")
      fd.set("password", "nuevaClave123")
      fd.set("confirmPassword", "otraClaveDiferente")

      const res = await resetAdminPasswordWithTokenAction(null, fd)
      expect(res.success).toBe(false)
      expect(res.error).toContain("no coinciden")
      expect(mockResetWithToken).not.toHaveBeenCalled()
    })

    it("restablece con éxito cuando coinciden y cumplen longitud", async () => {
      mockResetWithToken.mockResolvedValue({ success: true })

      const fd = new FormData()
      fd.set("token", "token-valido")
      fd.set("password", "nuevaClave123")
      fd.set("confirmPassword", "nuevaClave123")

      const res = await resetAdminPasswordWithTokenAction(null, fd)
      expect(res.success).toBe(true)
      expect(res.message).toContain("exitosa")
      expect(mockResetWithToken).toHaveBeenCalledWith("token-valido", "nuevaClave123")
    })
  })

  describe("changeAdminOwnPasswordAction", () => {
    it("falla si las contraseñas nuevas no coinciden", async () => {
      mockRequireAdmin.mockResolvedValue({
        user: { id: "admin-1", email: "admin@onestar.com" },
        session: { id: "sess-1" },
      })

      const fd = new FormData()
      fd.set("currentPassword", "claveActual123")
      fd.set("newPassword", "nuevaClave123")
      fd.set("confirmPassword", "distinta123")

      const res = await changeAdminOwnPasswordAction(null, fd)
      expect(res.success).toBe(false)
      expect(res.error).toContain("no coinciden")
      expect(mockChangeOwnPassword).not.toHaveBeenCalled()
    })

    it("actualiza contraseña propia exitosamente", async () => {
      mockRequireAdmin.mockResolvedValue({
        user: { id: "admin-1", email: "admin@onestar.com" },
        session: { id: "sess-1" },
      })
      mockChangeOwnPassword.mockResolvedValue({ success: true })

      const fd = new FormData()
      fd.set("currentPassword", "claveActual123")
      fd.set("newPassword", "nuevaClave123")
      fd.set("confirmPassword", "nuevaClave123")

      const res = await changeAdminOwnPasswordAction(null, fd)
      expect(res.success).toBe(true)
      expect(res.message).toContain("exitosa")
      expect(mockChangeOwnPassword).toHaveBeenCalledWith(
        "admin-1",
        "claveActual123",
        "nuevaClave123",
        "sess-1"
      )
    })
  })
})
