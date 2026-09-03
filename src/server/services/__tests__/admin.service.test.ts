import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/admin.repository", () => ({
  findAdminByEmail: vi.fn(),
  findAdminById: vi.fn(),
}))

import { getAdminByEmailForAuth, getAdminById } from "../admin.service"
import { findAdminByEmail, findAdminById } from "@/server/repositories/admin.repository"

const byEmail = vi.mocked(findAdminByEmail)
const byId = vi.mocked(findAdminById)

const admin = {
  id: "adm_1",
  email: "admin@onestar.com.co",
  name: "Admin",
  role: "SUPER_ADMIN" as const,
  passwordHash: "$2b$10$hash",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-02-01T00:00:00Z"),
}

beforeEach(() => vi.clearAllMocks())

describe("getAdminByEmailForAuth", () => {
  it("expone el hash de contraseña porque el login lo necesita para comparar", async () => {
    byEmail.mockResolvedValue(admin as never)

    const result = await getAdminByEmailForAuth(admin.email)

    expect(result).toEqual({
      id: "adm_1",
      email: "admin@onestar.com.co",
      name: "Admin",
      role: "SUPER_ADMIN",
      passwordHash: "$2b$10$hash",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    })
  })

  it("devuelve null cuando el correo no corresponde a ningún administrador", async () => {
    byEmail.mockResolvedValue(null)

    expect(await getAdminByEmailForAuth("nadie@onestar.com.co")).toBeNull()
  })
})

describe("getAdminById", () => {
  it("nunca expone el hash de contraseña", async () => {
    byId.mockResolvedValue(admin as never)

    const result = await getAdminById("adm_1")

    expect(result).not.toHaveProperty("passwordHash")
    expect(result).toMatchObject({ id: "adm_1", role: "SUPER_ADMIN" })
  })

  it("devuelve null cuando el id no existe", async () => {
    byId.mockResolvedValue(null)

    expect(await getAdminById("desconocido")).toBeNull()
  })
})
