import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const requireAdminMock = vi.fn()
const setLeadBotPausedMock = vi.fn()
const resolveLeadHandoffMock = vi.fn()
const setLeadTagsMock = vi.fn()
const setWhatsappBotGlobalEnabledMock = vi.fn()

vi.mock("@/server/auth/require-admin", () => ({
  requireAdmin: (...args: unknown[]) => requireAdminMock(...args),
}))

vi.mock("@/server/services/lead.service", () => ({
  setLeadBotPaused: (...args: unknown[]) => setLeadBotPausedMock(...args),
  resolveLeadHandoff: (...args: unknown[]) => resolveLeadHandoffMock(...args),
  setLeadTags: (...args: unknown[]) => setLeadTagsMock(...args),
  setWhatsappBotGlobalEnabled: (...args: unknown[]) => setWhatsappBotGlobalEnabledMock(...args),
}))

import {
  resolveLeadHandoffAction,
  toggleLeadBotAction,
  toggleWhatsappBotGlobalAction,
  updateLeadTagsAction,
} from "../lead-bot.actions"

describe("lead-bot.actions (autorización y control manual del bot)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("toggleLeadBotAction exige área 'sales' y actualiza el estado del lead", async () => {
    requireAdminMock.mockResolvedValueOnce({ user: { adminRole: "SALES_OPERATOR" } })
    setLeadBotPausedMock.mockResolvedValueOnce({
      id: "lead_1",
      botPaused: true,
      botPausedAt: "2026-11-23T15:30:00.000Z",
      botPausedUntil: null,
      needsHuman: false,
    })

    const res = await toggleLeadBotAction("wa_lead_1", true)

    expect(requireAdminMock).toHaveBeenCalledWith("sales")
    expect(setLeadBotPausedMock).toHaveBeenCalledWith("wa_lead_1", true)
    expect(res).toEqual({
      success: true,
      botPaused: true,
      botPausedUntil: null,
      needsHuman: false,
    })
  })

  it("resolveLeadHandoffAction exige área 'sales' y marca el traspaso como atendido", async () => {
    requireAdminMock.mockResolvedValueOnce({ user: { adminRole: "SALES_OPERATOR" } })
    resolveLeadHandoffMock.mockResolvedValueOnce({ id: "lead_1", needsHuman: false })

    const res = await resolveLeadHandoffAction("lead_1")

    expect(requireAdminMock).toHaveBeenCalledWith("sales")
    expect(resolveLeadHandoffMock).toHaveBeenCalledWith("lead_1")
    expect(res).toEqual({ success: true, needsHuman: false })
  })

  it("toggleLeadBotAction rechaza a un operador de inventario o usuario sin permisos", async () => {
    requireAdminMock.mockRejectedValueOnce(new Error("Tu rol no tiene permiso para esta acción."))

    const res = await toggleLeadBotAction("lead_1", true)

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/permiso/i)
    expect(setLeadBotPausedMock).not.toHaveBeenCalled()
  })

  it("toggleWhatsappBotGlobalAction exige Super Admin (requireAdmin sin argumentos)", async () => {
    requireAdminMock.mockResolvedValueOnce({ user: { adminRole: "SUPER_ADMIN" } })
    setWhatsappBotGlobalEnabledMock.mockResolvedValueOnce(false)

    const res = await toggleWhatsappBotGlobalAction(false)

    expect(requireAdminMock).toHaveBeenCalledWith()
    expect(setWhatsappBotGlobalEnabledMock).toHaveBeenCalledWith(false)
    expect(res).toEqual({ success: true, botGlobalEnabled: false })
  })

  it("toggleWhatsappBotGlobalAction rechaza si no es Super Admin", async () => {
    requireAdminMock.mockRejectedValueOnce(new Error("Esta acción requiere el rol Super Admin."))

    const res = await toggleWhatsappBotGlobalAction(false)

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/Super Admin/i)
    expect(setWhatsappBotGlobalEnabledMock).not.toHaveBeenCalled()
  })

  it("updateLeadTagsAction exige área 'sales' y guarda etiquetas normalizadas", async () => {
    requireAdminMock.mockResolvedValueOnce({ user: { adminRole: "SALES_OPERATOR" } })
    setLeadTagsMock.mockResolvedValueOnce({ id: "lead_1", tags: ["VIP", "Vans"] })

    const res = await updateLeadTagsAction("wa_lead_1", [" VIP ", "Vans", "vip"])

    expect(requireAdminMock).toHaveBeenCalledWith("sales")
    expect(setLeadTagsMock).toHaveBeenCalledWith("wa_lead_1", ["VIP", "Vans"])
    expect(res).toEqual({ success: true, tags: ["VIP", "Vans"] })
  })

  it("updateLeadTagsAction rechaza usuarios sin permiso de ventas", async () => {
    requireAdminMock.mockRejectedValueOnce(new Error("Tu rol no tiene permiso para esta acción."))

    const res = await updateLeadTagsAction("lead_1", ["VIP"])

    expect(res.success).toBe(false)
    expect(setLeadTagsMock).not.toHaveBeenCalled()
  })
})
