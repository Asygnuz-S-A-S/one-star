import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }))

const authMock = vi.hoisted(() => ({
  getSession: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: authMock.getSession } },
}))

const guestOrderServiceMock = vi.hoisted(() => ({
  requestGuestOrdersLinking: vi.fn(),
  consumeLinkOrdersTokenAndLink: vi.fn(),
}))

vi.mock("@/server/services/guest-order.service", () => ({
  requestGuestOrdersLinking: guestOrderServiceMock.requestGuestOrdersLinking,
  consumeLinkOrdersTokenAndLink: guestOrderServiceMock.consumeLinkOrdersTokenAndLink,
}))

import {
  requestGuestOrdersLinkingAction,
  confirmGuestOrdersLinkingAction,
} from "./actions"

describe("cuenta actions — vinculación de pedidos de invitado", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("requestGuestOrdersLinkingAction", () => {
    it("requiere usuario autenticado", async () => {
      authMock.getSession.mockResolvedValue(null)

      const result = await requestGuestOrdersLinkingAction()

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/iniciar sesión/i)
      expect(guestOrderServiceMock.requestGuestOrdersLinking).not.toHaveBeenCalled()
    })

    it("genera la solicitud y devuelve el mensaje neutral", async () => {
      authMock.getSession.mockResolvedValue({
        user: { id: "user-123", email: "cliente@onestar.co", name: "Cliente OneStar" },
      })
      guestOrderServiceMock.requestGuestOrdersLinking.mockResolvedValue({
        sent: true,
        message: "Si existen pedidos de invitado registrados con tu correo, hemos enviado un enlace de confirmación a tu bandeja de entrada.",
      })

      const result = await requestGuestOrdersLinkingAction()

      expect(result.success).toBe(true)
      expect(result.message).toContain("Si existen pedidos de invitado")
      expect(guestOrderServiceMock.requestGuestOrdersLinking).toHaveBeenCalledWith(
        "user-123",
        "cliente@onestar.co",
        "Cliente OneStar"
      )
    })
  })

  describe("confirmGuestOrdersLinkingAction", () => {
    it("rechaza tokens vacíos o no válidos", async () => {
      const result = await confirmGuestOrdersLinkingAction("")
      expect(result.success).toBe(false)
      expect(result.error).toContain("inválido")
    })

    it("vincula los pedidos exitosamente si el token es válido", async () => {
      guestOrderServiceMock.consumeLinkOrdersTokenAndLink.mockResolvedValue({
        email: "cliente@onestar.co",
        userId: "user-123",
        linkedOrdersCount: 2,
      })

      const result = await confirmGuestOrdersLinkingAction("token-valido-123")

      expect(result.success).toBe(true)
      expect(result.linkedCount).toBe(2)
      expect(guestOrderServiceMock.consumeLinkOrdersTokenAndLink).toHaveBeenCalledWith(
        "token-valido-123"
      )
    })

    it("devuelve error si el token expiró o ya fue usado", async () => {
      guestOrderServiceMock.consumeLinkOrdersTokenAndLink.mockResolvedValue(null)

      const result = await confirmGuestOrdersLinkingAction("token-invalido")

      expect(result.success).toBe(false)
      expect(result.error).toContain("inválido o ya ha expirado")
    })
  })
})
