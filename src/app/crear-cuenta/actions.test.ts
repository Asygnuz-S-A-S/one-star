import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({
  verifyGuestInviteToken: vi.fn(),
  consumeGuestInviteTokenAndLinkOrders: vi.fn(),
  registerUser: vi.fn(),
  emailExists: vi.fn(),
  findGuestOrdersByEmail: vi.fn(),
  prepareCustomerSignIn: vi.fn(),
}))

vi.mock("@/server/services/guest-order.service", () => ({
  verifyGuestInviteToken: mocks.verifyGuestInviteToken,
  consumeGuestInviteTokenAndLinkOrders: mocks.consumeGuestInviteTokenAndLinkOrders,
}))

vi.mock("@/server/services/user.service", () => ({
  registerUser: mocks.registerUser,
  emailExists: mocks.emailExists,
}))

vi.mock("@/server/repositories/order.repository", () => ({
  findGuestOrdersByEmail: mocks.findGuestOrdersByEmail,
}))

vi.mock("@/lib/auth-actions", () => ({
  prepareCustomerSignIn: mocks.prepareCustomerSignIn,
}))

import { getGuestInviteDetails, completeGuestAccountCreation } from "./actions"

describe("crear-cuenta actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getGuestInviteDetails", () => {
    it("devuelve los detalles de la invitación y sugiere nombres desde pedidos previos", async () => {
      mocks.verifyGuestInviteToken.mockResolvedValue({ email: "invitado@example.com" })
      mocks.findGuestOrdersByEmail.mockResolvedValue([
        { customerName: "María Camila Morales" },
      ])

      const result = await getGuestInviteDetails("valid-invite-token")

      expect(result).toEqual({
        valid: true,
        email: "invitado@example.com",
        suggestedName: "María",
        suggestedLastName: "Camila Morales",
        ordersCount: 1,
      })
    })

    it("devuelve valid: false si el token no es válido o expiró", async () => {
      mocks.verifyGuestInviteToken.mockResolvedValue(null)

      const result = await getGuestInviteDetails("token-invalido")

      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/no es válido|expirado/i)
    })
  })

  describe("completeGuestAccountCreation", () => {
    const validPayload = {
      token: "valid-token-123",
      name: "María",
      lastName: "Morales",
      password: "Password123!",
      confirmPassword: "Password123!",
      termsAccepted: true,
    }

    it("crea la cuenta, vincula pedidos, consume el token y autentica al usuario", async () => {
      mocks.verifyGuestInviteToken.mockResolvedValue({ email: "invitado@example.com" })
      mocks.findGuestOrdersByEmail.mockResolvedValue([
        { customerPhone: "3001234567", customerDocument: "1020304050" },
      ])
      mocks.emailExists.mockResolvedValue(false)
      mocks.registerUser.mockResolvedValue({ id: "new-user-1", email: "invitado@example.com" })
      mocks.consumeGuestInviteTokenAndLinkOrders.mockResolvedValue({
        email: "invitado@example.com",
        linkedOrdersCount: 1,
      })
      mocks.prepareCustomerSignIn.mockResolvedValue(undefined)

      const result = await completeGuestAccountCreation(validPayload)

      expect(result).toEqual({ success: true, email: "invitado@example.com" })
      expect(mocks.registerUser).toHaveBeenCalledWith({
        email: "invitado@example.com",
        password: "Password123!",
        name: "María",
        lastName: "Morales",
        phone: "3001234567",
        cedula: "1020304050",
        newsletter: undefined,
        joinClub: undefined,
      })
      expect(mocks.consumeGuestInviteTokenAndLinkOrders).toHaveBeenCalledWith(
        "valid-token-123",
        "new-user-1"
      )
      expect(mocks.prepareCustomerSignIn).toHaveBeenCalledWith("invitado@example.com", "Password123!")
    })

    it("falla si las contraseñas no coinciden", async () => {
      const result = await completeGuestAccountCreation({
        ...validPayload,
        confirmPassword: "PasswordDiferente",
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/no coinciden/i)
      expect(mocks.registerUser).not.toHaveBeenCalled()
    })

    it("falla si los términos no fueron aceptados", async () => {
      const result = await completeGuestAccountCreation({
        ...validPayload,
        termsAccepted: false,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/términos/i)
      expect(mocks.registerUser).not.toHaveBeenCalled()
    })

    it("falla si el correo ya pertenece a una cuenta registrada", async () => {
      mocks.verifyGuestInviteToken.mockResolvedValue({ email: "invitado@example.com" })
      mocks.emailExists.mockResolvedValue(true)

      const result = await completeGuestAccountCreation(validPayload)

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/ya tiene una cuenta registrada/i)
      expect(mocks.registerUser).not.toHaveBeenCalled()
    })

    it("falla si el token de invitación ya no es válido", async () => {
      mocks.verifyGuestInviteToken.mockResolvedValue(null)

      const result = await completeGuestAccountCreation(validPayload)

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/no es válido|expirado/i)
      expect(mocks.registerUser).not.toHaveBeenCalled()
    })
  })
})
