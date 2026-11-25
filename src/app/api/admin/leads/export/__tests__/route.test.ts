import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAdmin = vi.fn()
const exportLeadsToCsv = vi.fn()

vi.mock("@/server/auth/require-admin", () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }))
vi.mock("@/server/services/lead.service", () => ({ exportLeadsToCsv: (...args: unknown[]) => exportLeadsToCsv(...args) }))

import { GET } from "../route"

beforeEach(() => {
  vi.clearAllMocks()
  exportLeadsToCsv.mockResolvedValue("id,email\n")
})

describe("GET /api/admin/leads/export", () => {
  it("exige Super Admin (no basta el área de ventas)", async () => {
    requireAdmin.mockResolvedValue({})
    await GET(new Request("https://tienda.test/api/admin/leads/export"))
    expect(requireAdmin).toHaveBeenCalledTimes(1)
    // Sin argumento = área "superadmin". Si alguien lo cambia a "sales" esta prueba falla.
    expect(requireAdmin.mock.calls[0]).toEqual([])
  })

  it("responde 401 y no genera el CSV si el rol no alcanza (p. ej. Operador de Ventas)", async () => {
    requireAdmin.mockRejectedValue(new Error("Esta acción requiere el rol Super Admin."))
    const res = await GET(new Request("https://tienda.test/api/admin/leads/export?source=WHATSAPP"))
    expect(res.status).toBe(401)
    expect(exportLeadsToCsv).not.toHaveBeenCalled()
  })

  it("con Super Admin descarga el CSV respetando los filtros", async () => {
    requireAdmin.mockResolvedValue({})
    const res = await GET(new Request("https://tienda.test/api/admin/leads/export?source=WHATSAPP&tag=vip"))
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Disposition")).toContain("leads_onestar_vip_")
    expect(exportLeadsToCsv).toHaveBeenCalledWith(expect.objectContaining({ source: "WHATSAPP", tag: "vip" }))
  })
})
