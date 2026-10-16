import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { create, findMany } = vi.hoisted(() => ({ create: vi.fn(), findMany: vi.fn() }))

vi.mock("@/server/db/prisma", () => ({
  prisma: { erpSyncLog: { create, findMany } },
}))

import { createErpSyncLog, findRecentErpSyncLogs } from "../erp-sync-log.repository"

beforeEach(() => vi.clearAllMocks())

describe("erp-sync-log.repository", () => {
  it("guarda el registro de sincronización", async () => {
    create.mockResolvedValue({ id: "log_1" })

    await createErpSyncLog({ trigger: "MANUAL" } as never)

    expect(create).toHaveBeenCalledWith({ data: { trigger: "MANUAL" } })
  })

  it("devuelve los registros más recientes primero, con 10 por defecto", async () => {
    findMany.mockResolvedValue([])

    await findRecentErpSyncLogs()

    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" }, take: 10 })
  })

  it("respeta el límite pedido", async () => {
    findMany.mockResolvedValue([])

    await findRecentErpSyncLogs(3)

    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" }, take: 3 })
  })
})
