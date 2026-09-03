import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }))

vi.mock("@/server/db/prisma", () => ({
  prisma: { adminUser: { findUnique } },
}))

import { findAdminByEmail, findAdminById } from "../admin.repository"

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
})
