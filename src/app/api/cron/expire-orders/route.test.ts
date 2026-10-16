import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({ expireAbandonedOrders: vi.fn() }))

vi.mock("@/server/services/order.service", () => ({
  expireAbandonedOrders: mocks.expireAbandonedOrders,
}))

import { GET } from "./route"

describe("GET /api/cron/expire-orders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CRON_SECRET
    vi.stubEnv("NODE_ENV", "test")
  })

  it("vence los pedidos abandonados y reporta cuántos", async () => {
    mocks.expireAbandonedOrders.mockResolvedValue(["o-1", "o-2"])

    const response = await GET(new Request("http://localhost/api/cron/expire-orders"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ success: true, expired: 2 })
  })

  it("rechaza un secreto incorrecto antes de tocar los pedidos", async () => {
    process.env.CRON_SECRET = "correct-secret"

    const response = await GET(
      new Request("http://localhost/api/cron/expire-orders", {
        headers: { authorization: "Bearer wrong-secret" },
      })
    )

    expect(response.status).toBe(401)
    expect(mocks.expireAbandonedOrders).not.toHaveBeenCalled()
  })

  it("acepta el secreto correcto", async () => {
    process.env.CRON_SECRET = "correct-secret"
    mocks.expireAbandonedOrders.mockResolvedValue([])

    const response = await GET(
      new Request("http://localhost/api/cron/expire-orders", {
        headers: { authorization: "Bearer correct-secret" },
      })
    )

    expect(response.status).toBe(200)
  })

  it("falla cerrado en producción cuando CRON_SECRET no está configurado", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await GET(new Request("http://localhost/api/cron/expire-orders"))

    expect(response.status).toBe(503)
    expect(mocks.expireAbandonedOrders).not.toHaveBeenCalled()
  })

  it("responde 500 si el servicio falla", async () => {
    mocks.expireAbandonedOrders.mockRejectedValue(new Error("db"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await GET(new Request("http://localhost/api/cron/expire-orders"))

    expect(response.status).toBe(500)
  })
})
