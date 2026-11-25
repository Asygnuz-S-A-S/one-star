import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const repo = vi.hoisted(() => ({
  countActiveMcpTokens: vi.fn(),
  createMcpTokenRecord: vi.fn(),
  findMcpTokenByHash: vi.fn(),
  findMcpTokenOwner: vi.fn(),
  listMcpTokens: vi.fn(),
  revokeMcpTokenRecord: vi.fn(),
  touchMcpToken: vi.fn(),
}))
vi.mock("@/server/repositories/mcp.repository", () => repo)

import {
  authenticateMcpToken,
  createMcpToken,
  effectiveMcpRole,
  hashMcpToken,
  revokeMcpToken,
} from "../mcp-token.service"

const future = () => new Date(Date.now() + 86_400_000)

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: "tok_1",
    role: "SUPER_ADMIN",
    revokedAt: null,
    expiresAt: future(),
    lastUsedAt: null,
    adminUser: { id: "adm_1", email: "jm@onestar.com.co", name: "JM", role: "SUPER_ADMIN", isActive: true },
    ...overrides,
  }
}

describe("mcp-token.service (solo Super Admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repo.countActiveMcpTokens.mockResolvedValue(0)
    repo.createMcpTokenRecord.mockImplementation(async (data) => ({ id: "tok_new", ...data }))
    repo.touchMcpToken.mockResolvedValue({})
  })

  it("solo autoriza cuando admin y token son ambos SUPER_ADMIN", () => {
    expect(effectiveMcpRole("SUPER_ADMIN", "SUPER_ADMIN")).toBe("SUPER_ADMIN")
    expect(effectiveMcpRole("SUPER_ADMIN", "INVENTORY_OPERATOR")).toBeNull()
    expect(effectiveMcpRole("INVENTORY_OPERATOR", "SUPER_ADMIN")).toBeNull()
    expect(effectiveMcpRole("INVENTORY_OPERATOR", "INVENTORY_OPERATOR")).toBeNull()
    expect(effectiveMcpRole("SALES_OPERATOR", "SUPER_ADMIN")).toBeNull()
    expect(effectiveMcpRole("SUPER_ADMIN", "SALES_OPERATOR")).toBeNull()
    expect(effectiveMcpRole(null, "SUPER_ADMIN")).toBeNull()
    expect(effectiveMcpRole("super_admin", "SUPER_ADMIN")).toBeNull()
  })

  it("crea el token para Super Admin y guarda solo su hash", async () => {
    const { token } = await createMcpToken({ adminUserId: "adm_1", adminRole: "SUPER_ADMIN", name: "Mac" })
    expect(token).toMatch(/^osmcp_[A-Za-z0-9_-]{43}$/)
    const saved = repo.createMcpTokenRecord.mock.calls[0][0]
    expect(saved.role).toBe("SUPER_ADMIN")
    expect(saved.tokenHash).toBe(hashMcpToken(token))
    expect(JSON.stringify(saved)).not.toContain(token)
    expect(saved.prefix).toBe(token.slice(0, 12))
  })

  it("rechaza crear tokens a Inventario y Ventas, y limita los activos", async () => {
    await expect(createMcpToken({ adminUserId: "a", adminRole: "INVENTORY_OPERATOR", name: "x" })).rejects.toThrow("Super Admin")
    await expect(createMcpToken({ adminUserId: "a", adminRole: "SALES_OPERATOR", name: "x" })).rejects.toThrow("Super Admin")
    repo.countActiveMcpTokens.mockResolvedValue(5)
    await expect(createMcpToken({ adminUserId: "a", adminRole: "SUPER_ADMIN", name: "x" })).rejects.toThrow("Máximo 5")
    expect(repo.createMcpTokenRecord).not.toHaveBeenCalled()
  })

  it("autentica un token vigente de Super Admin", async () => {
    repo.findMcpTokenByHash.mockResolvedValue(record())
    const principal = await authenticateMcpToken("Bearer osmcp_abc")
    expect(repo.findMcpTokenByHash).toHaveBeenCalledWith(hashMcpToken("osmcp_abc"))
    expect(principal).toEqual({ tokenId: "tok_1", adminUserId: "adm_1", email: "jm@onestar.com.co", name: "JM", role: "SUPER_ADMIN" })
  })

  it.each([
    ["sin header", null, record()],
    ["sin Bearer", "osmcp_abc", record()],
    ["otro prefijo", "Bearer abc", record()],
    ["inexistente", "Bearer osmcp_abc", null],
    ["revocado", "Bearer osmcp_abc", record({ revokedAt: new Date() })],
    ["vencido", "Bearer osmcp_abc", record({ expiresAt: new Date(Date.now() - 1) })],
    ["admin inactivo", "Bearer osmcp_abc", record({ adminUser: { ...record().adminUser, isActive: false } })],
    ["admin degradado a Inventario", "Bearer osmcp_abc", record({ adminUser: { ...record().adminUser, role: "INVENTORY_OPERATOR" } })],
    ["token viejo de Inventario", "Bearer osmcp_abc", record({ role: "INVENTORY_OPERATOR" })],
    ["admin de Ventas", "Bearer osmcp_abc", record({ adminUser: { ...record().adminUser, role: "SALES_OPERATOR" } })],
  ])("rechaza: %s", async (_label, header, found) => {
    repo.findMcpTokenByHash.mockResolvedValue(found)
    expect(await authenticateMcpToken(header)).toBeNull()
  })

  it("si la BD falla, niega (fail-closed)", async () => {
    repo.findMcpTokenByHash.mockRejectedValue(new Error("db down"))
    expect(await authenticateMcpToken("Bearer osmcp_abc")).toBeNull()
  })

  it("el dueño o un Super Admin revocan; otro operador no", async () => {
    repo.findMcpTokenOwner.mockResolvedValue({ adminUserId: "adm_1", revokedAt: null })
    await revokeMcpToken("tok_1", { id: "adm_1", role: "INVENTORY_OPERATOR" })
    await revokeMcpToken("tok_1", { id: "adm_2", role: "SUPER_ADMIN" })
    expect(repo.revokeMcpTokenRecord).toHaveBeenCalledTimes(2)
    await expect(revokeMcpToken("tok_1", { id: "adm_3", role: "INVENTORY_OPERATOR" })).rejects.toThrow("no encontrado")
  })
})
