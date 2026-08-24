import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  findAdmin: vi.fn(),
  comparePassword: vi.fn(),
  upsertAuthUser: vi.fn(),
  findAuthAccount: vi.fn(),
  alertMissingIp: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ headers: mocks.headers }))
vi.mock("bcryptjs", () => ({ compareSync: mocks.comparePassword }))
vi.mock("@/server/services/admin-login-security-alert.service", () => ({
  alertAdminLoginWithoutTrustedIp: mocks.alertMissingIp,
}))
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    adminUser: { findUnique: mocks.findAdmin },
    user: { findUnique: vi.fn() },
    authUser: { upsert: mocks.upsertAuthUser },
    authAccount: {
      findFirst: mocks.findAuthAccount,
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prepareAdminSignIn } from "./auth-actions"

describe("prepareAdminSignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.headers.mockResolvedValue(
      new Headers({
        "x-real-ip": "198.51.100.20",
        "x-forwarded-for": "198.51.100.200, 10.0.0.1",
      })
    )
    mocks.findAdmin.mockResolvedValue(null)
    mocks.comparePassword.mockReturnValue(false)
    mocks.upsertAuthUser.mockResolvedValue({ id: "admin-1" })
    mocks.findAuthAccount.mockResolvedValue({
      id: "account-1",
      password: "stored-hash",
    })
  })

  it("bloquea el sexto intento antes de consultar las credenciales", async () => {
    const email = "rate-limited-admin@example.com"

    for (let attempt = 1; attempt <= 5; attempt++) {
      await expect(prepareAdminSignIn(email, "incorrecta")).resolves.toEqual({
        success: false,
        error: "Credenciales incorrectas.",
      })
    }

    await expect(prepareAdminSignIn(email, "incorrecta")).resolves.toEqual({
      success: false,
      error: "Demasiados intentos. Intenta de nuevo en 15 minutos.",
    })
    expect(mocks.findAdmin).toHaveBeenCalledTimes(5)
    expect(mocks.alertMissingIp).not.toHaveBeenCalled()
  })

  it("acepta una IPv6 confiable sin emitir alerta", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "x-real-ip": "2001:db8::10" }))

    await expect(
      prepareAdminSignIn("ipv6-admin@example.com", "incorrecta")
    ).resolves.toMatchObject({ error: "Credenciales incorrectas." })

    expect(mocks.findAdmin).toHaveBeenCalledOnce()
    expect(mocks.alertMissingIp).not.toHaveBeenCalled()
  })

  it("limpia los intentos cuando las credenciales son correctas", async () => {
    const email = "successful-admin@example.com"

    for (let attempt = 1; attempt <= 4; attempt++) {
      await prepareAdminSignIn(email, "incorrecta")
    }

    mocks.findAdmin.mockResolvedValue({
      id: "admin-1",
      email,
      name: "Admin",
      passwordHash: "stored-hash",
    })
    mocks.comparePassword.mockReturnValue(true)
    await expect(prepareAdminSignIn(email, "correcta")).resolves.toEqual({ success: true })

    mocks.findAdmin.mockResolvedValue(null)
    mocks.comparePassword.mockReturnValue(false)
    for (let attempt = 1; attempt <= 5; attempt++) {
      await expect(prepareAdminSignIn(email, "incorrecta")).resolves.toMatchObject({
        error: "Credenciales incorrectas.",
      })
    }
  })

  it("mantiene el límite cuando el proxy no entrega una IP", async () => {
    mocks.headers.mockResolvedValue(new Headers())
    const email = "unknown-ip-admin@example.com"

    for (let attempt = 1; attempt <= 20; attempt++) {
      await expect(prepareAdminSignIn(email, "incorrecta")).resolves.toMatchObject({
        error: "Credenciales incorrectas.",
      })
    }

    await expect(prepareAdminSignIn(email, "incorrecta")).resolves.toMatchObject({
      error: "Demasiados intentos. Intenta de nuevo en 15 minutos.",
    })
    expect(mocks.findAdmin).toHaveBeenCalledTimes(20)
    expect(mocks.alertMissingIp).toHaveBeenCalledTimes(21)
    expect(mocks.alertMissingIp).toHaveBeenCalledWith("missing")
    expect(mocks.alertMissingIp.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.findAdmin.mock.invocationCallOrder[0]
    )
  })

  it.each([
    {
      scenario: "vacía",
      headerValue: "   ",
      reason: "missing" as const,
      email: "empty-real-ip@example.com",
    },
    {
      scenario: "inválida",
      headerValue: "definitely-not-an-ip",
      reason: "invalid" as const,
      email: "invalid-real-ip@example.com",
    },
  ])(
    "usa unknown 20/21 y clasifica una cabecera $scenario",
    async ({ headerValue, reason, email }) => {
      mocks.headers.mockResolvedValue({
        get: vi.fn().mockReturnValue(headerValue),
      })

      for (let attempt = 1; attempt <= 20; attempt++) {
        await expect(prepareAdminSignIn(email, "incorrecta")).resolves.toMatchObject({
          error: "Credenciales incorrectas.",
        })
      }

      await expect(prepareAdminSignIn(email, "incorrecta")).resolves.toMatchObject({
        error: "Demasiados intentos. Intenta de nuevo en 15 minutos.",
      })
      expect(mocks.findAdmin).toHaveBeenCalledTimes(20)
      expect(mocks.alertMissingIp).toHaveBeenCalledTimes(21)
      expect(mocks.alertMissingIp).toHaveBeenCalledWith(reason)
    }
  )

  it("ignora x-forwarded-for aportado por el cliente", async () => {
    const email = "spoofed-forwarded-for@example.com"
    mocks.headers.mockResolvedValue(new Headers())

    for (let attempt = 1; attempt <= 20; attempt++) {
      mocks.headers.mockResolvedValue(
        new Headers({ "x-forwarded-for": `198.51.100.${attempt}` })
      )
      await expect(prepareAdminSignIn(email, "incorrecta")).resolves.toMatchObject({
        error: "Credenciales incorrectas.",
      })
    }

    mocks.headers.mockResolvedValue(
      new Headers({ "x-forwarded-for": "203.0.113.200" })
    )
    await expect(prepareAdminSignIn(email, "incorrecta")).resolves.toMatchObject({
      error: "Demasiados intentos. Intenta de nuevo en 15 minutos.",
    })
    expect(mocks.findAdmin).toHaveBeenCalledTimes(20)
    expect(mocks.alertMissingIp).toHaveBeenCalledWith("missing")
  })

  it("no limpia el límite cuando falla la sincronización con better-auth", async () => {
    const email = "failed-auth-sync@example.com"

    for (let attempt = 1; attempt <= 4; attempt++) {
      await prepareAdminSignIn(email, "incorrecta")
    }

    mocks.findAdmin.mockResolvedValue({
      id: "admin-1",
      email,
      name: "Admin",
      passwordHash: "stored-hash",
    })
    mocks.comparePassword.mockReturnValue(true)
    mocks.upsertAuthUser.mockRejectedValueOnce(new Error("auth sync failed"))

    await expect(prepareAdminSignIn(email, "correcta")).rejects.toThrow(
      "auth sync failed"
    )

    mocks.findAdmin.mockResolvedValue(null)
    mocks.comparePassword.mockReturnValue(false)
    await expect(prepareAdminSignIn(email, "incorrecta")).resolves.toMatchObject({
      error: "Demasiados intentos. Intenta de nuevo en 15 minutos.",
    })
  })
})
