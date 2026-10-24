import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }))

vi.mock("@/server/db/prisma", () => ({
  prisma: { adminUser: { findUnique } },
}))

import {
  findAdminByEmail,
  findAdminById,
  findAdminRoleById,
  findAdminRoleByIdOrEmail,
} from "../admin.repository"

beforeEach(() => vi.clearAllMocks())

describe("admin.repository", () => {
  it("busca por correo con la clave única de email", async () => {
    findUnique.mockResolvedValue({ id: "adm_1" })

    expect(await findAdminByEmail("admin@onestar.com.co")).toEqual({ id: "adm_1" })
    expect(findUnique).toHaveBeenCalledWith({ where: { email: "admin@onestar.com.co" } })
  })

  it("busca por id", async () => {
    findUnique.mockResolvedValue(null)

    expect(await findAdminById("adm_1")).toBeNull()
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "adm_1" } })
  })

  it("obtiene el rol por id", async () => {
    findUnique.mockResolvedValue({ role: "SUPER_ADMIN" })

    expect(await findAdminRoleById("adm_1")).toBe("SUPER_ADMIN")
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "adm_1" },
      select: { role: true },
    })
  })

  it("obtiene el rol por id o por email como fallback", async () => {
    findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ role: "INVENTORY_OPERATOR", isActive: true })

    expect(await findAdminRoleByIdOrEmail("adm_unknown", "op@onestar.com.co")).toBe(
      "INVENTORY_OPERATOR"
    )
    expect(findUnique).toHaveBeenNthCalledWith(1, {
      where: { id: "adm_unknown" },
      select: { role: true, isActive: true },
    })
    expect(findUnique).toHaveBeenNthCalledWith(2, {
      where: { email: "op@onestar.com.co" },
      select: { role: true, isActive: true },
    })
  })

  it("no entrega rol si la cuenta está desactivada", async () => {
    findUnique.mockResolvedValue({ role: "SUPER_ADMIN", isActive: false })

    expect(await findAdminRoleByIdOrEmail("adm_1", "admin@onestar.com.co")).toBeNull()
  })

  it("devuelve null si no existe por id ni por email", async () => {
    findUnique.mockResolvedValue(null)

    expect(await findAdminRoleByIdOrEmail("adm_nope", "nadie@onestar.com.co")).toBeNull()
  })
})
