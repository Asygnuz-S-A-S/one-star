import { beforeEach, describe, expect, it, vi } from "vitest"
import { hashSync } from "bcryptjs"

const prismaMock = vi.hoisted(() => ({
  adminUser: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  authUser: { upsert: vi.fn() },
  authAccount: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
}))

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }))
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers({ "x-real-ip": "1.2.3.4" })),
}))
vi.mock("@/server/services/admin-login-rate-limit.service", () => ({
  consumeAdminLoginAttempt: () => ({ allowed: true }),
  resetAdminLoginAttempts: vi.fn(),
}))
vi.mock("@/server/services/admin-login-security-alert.service", () => ({
  alertAdminLoginWithoutTrustedIp: vi.fn(),
}))

import { prepareAdminSignIn } from "@/lib/auth-actions"

const hash = hashSync("clave-de-prueba-123", 4)

describe("prepareAdminSignIn → cuenta credential para Better Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.adminUser.findUnique.mockResolvedValue({
      id: "adm_1",
      email: "admin@onestar.com",
      name: "Admin",
      passwordHash: hash,
      isActive: true,
      role: "SUPER_ADMIN",
    })
    prismaMock.authUser.upsert.mockResolvedValue({ id: "adm_1" })
  })

  it("crea la cuenta con accountId = id del usuario (Better Auth >= 1.7 lo exige)", async () => {
    prismaMock.authAccount.findFirst.mockResolvedValue(null)

    const res = await prepareAdminSignIn("admin@onestar.com", "clave-de-prueba-123")

    expect(res.success).toBe(true)
    expect(prismaMock.authAccount.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ accountId: "adm_1", userId: "adm_1", password: hash }),
    })
  })

  it("repara una cuenta vieja con accountId = email aunque la clave ya coincida", async () => {
    prismaMock.authAccount.findFirst.mockResolvedValue({
      id: "acc_1",
      accountId: "admin@onestar.com",
      password: hash,
    })

    await prepareAdminSignIn("admin@onestar.com", "clave-de-prueba-123")

    expect(prismaMock.authAccount.update).toHaveBeenCalledWith({
      where: { id: "acc_1" },
      data: expect.objectContaining({ accountId: "adm_1", password: hash }),
    })
  })

  it("no escribe si la cuenta ya está bien", async () => {
    prismaMock.authAccount.findFirst.mockResolvedValue({ id: "acc_1", accountId: "adm_1", password: hash })

    await prepareAdminSignIn("admin@onestar.com", "clave-de-prueba-123")

    expect(prismaMock.authAccount.update).not.toHaveBeenCalled()
    expect(prismaMock.authAccount.create).not.toHaveBeenCalled()
  })
})
