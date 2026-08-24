import type { ErrorEvent } from "@sentry/nextjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@sentry/nextjs", () => ({ init: mocks.init }))

describe("instrumentation-node", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.init.mockReset()
    vi.stubEnv("VERCEL", "1")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("conecta la allowlist de seguridad como beforeSend de Sentry", async () => {
    await import("./instrumentation-node")

    const options = mocks.init.mock.calls[0]?.[0] as {
      beforeSend?: (event: ErrorEvent) => ErrorEvent | null
    }
    const event: ErrorEvent = {
      type: undefined,
      message: "Admin login request without a trusted IP",
      tags: {
        security_event: "admin_login_untrusted_ip",
        reason: "missing",
        email: "admin@example.com",
      },
      user: { email: "admin@example.com" },
      request: { cookies: { session: "secret-cookie" } },
    }

    expect(options.beforeSend).toEqual(expect.any(Function))
    expect(options.beforeSend?.(event)).toEqual({
      event_id: undefined,
      timestamp: undefined,
      platform: undefined,
      level: undefined,
      message: "Admin login request without a trusted IP",
      fingerprint: undefined,
      tags: {
        security_event: "admin_login_untrusted_ip",
        reason: "missing",
      },
    })
  })
})
