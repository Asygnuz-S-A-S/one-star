import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const prismaMock = vi.hoisted(() => ({
  erpSyncConfig: {
    findUniqueOrThrow: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
  },
  $queryRaw: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }))

import {
  claimDueErpSync,
  disableErpSyncSchedule,
  getOrCreateErpSyncConfig,
  saveErpSyncConfig,
} from "../erp-sync-config.repository"

describe("erp-sync-config.repository", () => {
  beforeEach(() => vi.clearAllMocks())

  it("desactiva y limpia el vencimiento sin sobrescribir intervalMinutes", async () => {
    const observedAt = new Date("2026-08-31T12:00:00.000Z")
    prismaMock.erpSyncConfig.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.erpSyncConfig.findUniqueOrThrow.mockResolvedValue({})

    await disableErpSyncSchedule(observedAt)

    expect(prismaMock.erpSyncConfig.updateMany).toHaveBeenCalledWith({
      where: { id: "default", updatedAt: observedAt },
      data: { enabled: false, nextRunAt: null },
    })
    expect(prismaMock.erpSyncConfig.updateMany.mock.calls[0]?.[0]?.data).not.toHaveProperty(
      "intervalMinutes"
    )
    expect(prismaMock.erpSyncConfig.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "default" },
    })
  })

  it("devuelve la versión concurrente sin sobrescribirla cuando updatedAt ya cambió", async () => {
    const observedAt = new Date("2026-08-31T12:00:00.000Z")
    const concurrentConfig = {
      enabled: true,
      intervalMinutes: 120,
      nextRunAt: new Date("2026-08-31T14:00:00.000Z"),
    }
    prismaMock.erpSyncConfig.updateMany.mockResolvedValue({ count: 0 })
    prismaMock.erpSyncConfig.findUniqueOrThrow.mockResolvedValue(concurrentConfig)

    await expect(disableErpSyncSchedule(observedAt)).resolves.toBe(concurrentConfig)
    expect(prismaMock.erpSyncConfig.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "default", updatedAt: observedAt } })
    )
  })

  it("devuelve null cuando otro proceso ya reclamó el vencimiento", async () => {
    const now = new Date("2026-08-06T12:00:00.000Z")
    prismaMock.$queryRaw.mockResolvedValue([])

    await expect(claimDueErpSync(now)).resolves.toBeNull()

    expect(prismaMock.$queryRaw).toHaveBeenCalledOnce()
  })

  it("crea el singleton con el vencimiento predeterminado a 30 minutos", async () => {
    const now = new Date("2026-08-06T12:00:00.000Z")
    prismaMock.erpSyncConfig.upsert.mockResolvedValue({})

    await getOrCreateErpSyncConfig(now)

    expect(prismaMock.erpSyncConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "default" },
        create: expect.objectContaining({
          enabled: true,
          intervalMinutes: 30,
          nextRunAt: new Date("2026-08-06T12:30:00.000Z"),
        }),
      })
    )
  })

  it("elimina el próximo vencimiento al desactivar", async () => {
    prismaMock.erpSyncConfig.upsert.mockResolvedValue({})

    await saveErpSyncConfig(
      { enabled: false, intervalMinutes: 120 },
      new Date("2026-08-06T12:00:00.000Z")
    )

    expect(prismaMock.erpSyncConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          enabled: false,
          intervalMinutes: 120,
          nextRunAt: null,
        }),
      })
    )
  })

  it("programa desde el momento de guardar al activar o cambiar frecuencia", async () => {
    prismaMock.erpSyncConfig.upsert.mockResolvedValue({})

    await saveErpSyncConfig(
      { enabled: true, intervalMinutes: 360 },
      new Date("2026-08-06T12:00:00.000Z")
    )

    expect(prismaMock.erpSyncConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          nextRunAt: new Date("2026-08-06T18:00:00.000Z"),
        }),
      })
    )
  })
})
