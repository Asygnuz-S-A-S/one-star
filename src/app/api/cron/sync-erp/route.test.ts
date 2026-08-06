import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({ runDueErpSync: vi.fn() }))

vi.mock("@/server/services/erp-sync-scheduler.service", () => ({
  runDueErpSync: mocks.runDueErpSync,
}))

import { GET } from "./route"

describe("GET /api/cron/sync-erp", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CRON_SECRET
    vi.stubEnv("NODE_ENV", "test")
  })

  it("responde omitido cuando la sincronización está apagada o aún no vence", async () => {
    mocks.runDueErpSync.mockResolvedValue({
      executed: false,
      reason: "disabled_or_not_due",
    })

    const response = await GET(new Request("http://localhost/api/cron/sync-erp"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ success: true, executed: false })
  })

  it("rechaza un secreto incorrecto antes de consultar el coordinador", async () => {
    process.env.CRON_SECRET = "correct-secret"

    const response = await GET(
      new Request("http://localhost/api/cron/sync-erp", {
        headers: { authorization: "Bearer wrong-secret" },
      })
    )

    expect(response.status).toBe(401)
    expect(mocks.runDueErpSync).not.toHaveBeenCalled()
  })

  it("falla cerrado en producción cuando CRON_SECRET no está configurado", async () => {
    vi.stubEnv("NODE_ENV", "production")

    const response = await GET(new Request("http://localhost/api/cron/sync-erp"))

    expect(response.status).toBe(503)
    expect(mocks.runDueErpSync).not.toHaveBeenCalled()
  })

  it("devuelve el resultado cuando el coordinador reclama el vencimiento", async () => {
    mocks.runDueErpSync.mockResolvedValue({
      executed: true,
      result: { success: true, processedCount: 8 },
    })

    const response = await GET(new Request("http://localhost/api/cron/sync-erp"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      executed: true,
      processed: 8,
    })
  })
})
