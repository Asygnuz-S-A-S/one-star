import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const authVerificationRepoMock = vi.hoisted(() => ({
  createAuthVerification: vi.fn(),
  findAuthVerificationByValue: vi.fn(),
  deleteAuthVerification: vi.fn(),
}))

const orderRepoMock = vi.hoisted(() => ({
  linkGuestOrdersByEmail: vi.fn(),
}))

vi.mock("@/server/repositories/auth-verification.repository", () => ({
  createAuthVerification: authVerificationRepoMock.createAuthVerification,
  findAuthVerificationByValue: authVerificationRepoMock.findAuthVerificationByValue,
  deleteAuthVerification: authVerificationRepoMock.deleteAuthVerification,
}))

vi.mock("@/server/repositories/order.repository", () => ({
  linkGuestOrdersByEmail: orderRepoMock.linkGuestOrdersByEmail,
}))

import {
  signGuestOrderSuccessToken,
  verifyGuestOrderSuccessToken,
  createGuestAccountInviteToken,
  verifyGuestInviteToken,
  consumeGuestInviteTokenAndLinkOrders,
} from "../guest-order.service"

describe("guest-order.service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("signGuestOrderSuccessToken & verifyGuestOrderSuccessToken", () => {
    it("firma y valida correctamente un token de éxito para un pedido de invitado", () => {
      const orderId = "order_12345"
      const token = signGuestOrderSuccessToken(orderId, 3600)

      expect(typeof token).toBe("string")
      const verified = verifyGuestOrderSuccessToken(token)

      expect(verified).not.toBeNull()
      expect(verified?.orderId).toBe(orderId)
    })

    it("rechaza el token si ha expirado", () => {
      const orderId = "order_12345"
      // ttlSeconds negativo para simular token ya expirado
      const token = signGuestOrderSuccessToken(orderId, -10)

      const verified = verifyGuestOrderSuccessToken(token)
      expect(verified).toBeNull()
    })

    it("rechaza un token manipulado en el orderId o en la firma", () => {
      const token = signGuestOrderSuccessToken("order_12345", 3600)
      const parts = token.split(".")

      // Alterar el orderId
      const tamperedOrderId = `order_99999.${parts[1]}.${parts[2]}`
      expect(verifyGuestOrderSuccessToken(tamperedOrderId)).toBeNull()

      // Alterar la firma
      const tamperedSig = `${parts[0]}.${parts[1]}.invalidsignature`
      expect(verifyGuestOrderSuccessToken(tamperedSig)).toBeNull()
    })

    it("rechaza valores nulos, vacíos o con formato inválido", () => {
      expect(verifyGuestOrderSuccessToken(null)).toBeNull()
      expect(verifyGuestOrderSuccessToken("")).toBeNull()
      expect(verifyGuestOrderSuccessToken("sin-puntos")).toBeNull()
      expect(verifyGuestOrderSuccessToken("uno.dos")).toBeNull()
      expect(verifyGuestOrderSuccessToken("uno.nan.firma")).toBeNull()
    })
  })

  describe("createGuestAccountInviteToken", () => {
    it("crea un token de 64 caracteres hex y lo guarda con prefijo en AuthVerification", async () => {
      const email = "Cliente.Invitado@Example.Com"
      const token = await createGuestAccountInviteToken(email)

      expect(token).toHaveLength(64)
      expect(authVerificationRepoMock.createAuthVerification).toHaveBeenCalledWith({
        id: expect.any(String),
        identifier: "guest_invite:cliente.invitado@example.com",
        value: token,
        expiresAt: expect.any(Date),
      })
    })
  })

  describe("verifyGuestInviteToken", () => {
    it("devuelve el email si el token existe y está vigente", async () => {
      authVerificationRepoMock.findAuthVerificationByValue.mockResolvedValueOnce({
        id: "verif-1",
        identifier: "guest_invite:invitado@tienda.com",
        value: "token-valido-123",
        expiresAt: new Date(Date.now() + 100000),
      })

      const result = await verifyGuestInviteToken("token-valido-123")

      expect(result).toEqual({ email: "invitado@tienda.com" })
    })

    it("devuelve null si el token no existe", async () => {
      authVerificationRepoMock.findAuthVerificationByValue.mockResolvedValueOnce(null)

      const result = await verifyGuestInviteToken("inexistente")
      expect(result).toBeNull()
    })

    it("devuelve null si el token ya expiró", async () => {
      authVerificationRepoMock.findAuthVerificationByValue.mockResolvedValueOnce({
        id: "verif-2",
        identifier: "guest_invite:invitado@tienda.com",
        value: "token-expirado",
        expiresAt: new Date(Date.now() - 5000),
      })

      const result = await verifyGuestInviteToken("token-expirado")
      expect(result).toBeNull()
    })

    it("devuelve null si el identificador no tiene el prefijo de invitado", async () => {
      authVerificationRepoMock.findAuthVerificationByValue.mockResolvedValueOnce({
        id: "verif-3",
        identifier: "email_verification:invitado@tienda.com",
        value: "token-otro",
        expiresAt: new Date(Date.now() + 100000),
      })

      const result = await verifyGuestInviteToken("token-otro")
      expect(result).toBeNull()
    })
  })

  describe("consumeGuestInviteTokenAndLinkOrders", () => {
    it("elimina el token (consumo de un solo uso) y vincula los pedidos previos al usuario", async () => {
      const mockRecord = {
        id: "verif-123",
        identifier: "guest_invite:comprador@example.com",
        value: "single-use-token",
        expiresAt: new Date(Date.now() + 60000),
      }
      authVerificationRepoMock.findAuthVerificationByValue.mockResolvedValue(mockRecord)
      orderRepoMock.linkGuestOrdersByEmail.mockResolvedValue(2)

      const result = await consumeGuestInviteTokenAndLinkOrders("single-use-token", "user-nuevo-1")

      expect(result).toEqual({
        email: "comprador@example.com",
        linkedOrdersCount: 2,
      })
      expect(authVerificationRepoMock.deleteAuthVerification).toHaveBeenCalledWith("verif-123")
      expect(orderRepoMock.linkGuestOrdersByEmail).toHaveBeenCalledWith(
        "comprador@example.com",
        "user-nuevo-1"
      )
    })

    it("no vincula pedidos si el token es inválido o no existe", async () => {
      authVerificationRepoMock.findAuthVerificationByValue.mockResolvedValue(null)

      const result = await consumeGuestInviteTokenAndLinkOrders("token-falso", "user-1")

      expect(result).toBeNull()
      expect(authVerificationRepoMock.deleteAuthVerification).not.toHaveBeenCalled()
      expect(orderRepoMock.linkGuestOrdersByEmail).not.toHaveBeenCalled()
    })
  })
})
