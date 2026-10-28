import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  removeExpired: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/server/repositories/request-rate-limit.repository", () => ({
  consumeRequestRateLimit: mocks.consume,
  removeExpiredRequestRateLimits: mocks.removeExpired,
}))

import { consumePublicRateLimit } from "./public-rate-limit.service"

describe("consumePublicRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.consume.mockResolvedValue({ count: 1, resetAt: new Date(Date.now() + 60_000) })
    mocks.removeExpired.mockResolvedValue(undefined)
  })

  it("ignores client-controlled X-Forwarded-For when deriving the limit key", async () => {
    await consumePublicRateLimit("test", new Headers({
      "x-real-ip": "198.51.100.10",
      "x-forwarded-for": "203.0.113.1",
    }), { max: 1, windowMs: 60_000 })
    const firstKey = mocks.consume.mock.calls[0][0]

    await consumePublicRateLimit("test", new Headers({
      "x-real-ip": "198.51.100.10",
      "x-forwarded-for": "203.0.113.99",
    }), { max: 1, windowMs: 60_000 })

    expect(mocks.consume.mock.calls[1][0]).toBe(firstKey)
  })

  it("fails closed with a shared unknown bucket when X-Real-IP is missing", async () => {
    await consumePublicRateLimit("test", new Headers({ "x-forwarded-for": "198.51.100.10" }), {
      max: 1,
      windowMs: 60_000,
    })
    const missingIpKey = mocks.consume.mock.calls[0][0]

    await consumePublicRateLimit("test", new Headers({ "x-forwarded-for": "198.51.100.99" }), {
      max: 1,
      windowMs: 60_000,
    })

    expect(mocks.consume.mock.calls[1][0]).toBe(missingIpKey)
  })

  it("returns retry metadata after the configured maximum", async () => {
    mocks.consume.mockResolvedValue({ count: 2, resetAt: new Date(Date.now() + 4_000) })

    await expect(consumePublicRateLimit("test", new Headers(), { max: 1, windowMs: 60_000 }))
      .resolves.toMatchObject({ allowed: false, retryAfterSeconds: expect.any(Number) })
  })
})
