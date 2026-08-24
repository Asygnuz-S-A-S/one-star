import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  captureMessage: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
}))

async function loadService() {
  vi.resetModules()
  return import("../admin-login-security-alert.service")
}

describe("admin login security alert", () => {
  beforeEach(() => {
    mocks.captureMessage.mockReset()
  })

  it("reporta una cabecera ausente con un payload estable y sin datos sensibles", async () => {
    const { alertAdminLoginWithoutTrustedIp } = await loadService()

    alertAdminLoginWithoutTrustedIp("missing", 1_000)

    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "Admin login request without a trusted IP",
      {
        level: "warning",
        fingerprint: ["admin-login-untrusted-ip"],
        tags: {
          security_event: "admin_login_untrusted_ip",
          reason: "missing",
        },
      }
    )
  })

  it("clasifica una cabecera inválida sin recibir ni reportar su valor", async () => {
    const { alertAdminLoginWithoutTrustedIp } = await loadService()

    alertAdminLoginWithoutTrustedIp("invalid", 2_000)

    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "Admin login request without a trusted IP",
      expect.objectContaining({
        level: "warning",
        tags: expect.objectContaining({ reason: "invalid" }),
      })
    )
  })

  it("deduplica missing e invalid a una alerta por proceso cada quince minutos", async () => {
    const { alertAdminLoginWithoutTrustedIp } = await loadService()
    const now = 3_000

    alertAdminLoginWithoutTrustedIp("missing", now)
    alertAdminLoginWithoutTrustedIp("invalid", now + 1)
    alertAdminLoginWithoutTrustedIp("missing", now + 15 * 60 * 1_000 - 1)
    alertAdminLoginWithoutTrustedIp("invalid", now + 15 * 60 * 1_000)

    expect(mocks.captureMessage).toHaveBeenCalledTimes(2)
  })

  it("no interrumpe la autenticación y reintenta si Sentry falla", async () => {
    const { alertAdminLoginWithoutTrustedIp } = await loadService()
    mocks.captureMessage.mockImplementationOnce(() => {
      throw new Error("Sentry unavailable")
    })

    expect(() => alertAdminLoginWithoutTrustedIp("missing", 4_000)).not.toThrow()
    expect(() => alertAdminLoginWithoutTrustedIp("missing", 4_001)).not.toThrow()
    expect(mocks.captureMessage).toHaveBeenCalledTimes(2)
  })
})
