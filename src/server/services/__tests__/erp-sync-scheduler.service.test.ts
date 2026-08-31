import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({
  claimDueErpSync: vi.fn(),
  disableErpSyncSchedule: vi.fn(),
  getERPAdapter: vi.fn(),
  getOrCreateErpSyncConfig: vi.fn(),
  saveErpSyncConfig: vi.fn(),
  supportsCatalogSync: vi.fn(),
  syncCatalogFromERP: vi.fn(),
}))

vi.mock("@/server/erp", () => ({
  getERPAdapter: mocks.getERPAdapter,
  supportsCatalogSync: mocks.supportsCatalogSync,
}))

vi.mock("@/server/repositories/erp-sync-config.repository", () => ({
  claimDueErpSync: mocks.claimDueErpSync,
  disableErpSyncSchedule: mocks.disableErpSyncSchedule,
  getOrCreateErpSyncConfig: mocks.getOrCreateErpSyncConfig,
  saveErpSyncConfig: mocks.saveErpSyncConfig,
}))
vi.mock("@/server/services/erp-sync.service", () => ({
  syncCatalogFromERP: mocks.syncCatalogFromERP,
}))

import {
  getErpSyncSchedule,
  runDueErpSync,
  updateErpSyncSchedule,
} from "../erp-sync-scheduler.service"

describe("erp-sync-scheduler.service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getERPAdapter.mockReturnValue({})
    mocks.supportsCatalogSync.mockReturnValue(true)
  })

  it("reconcilia una programación activa incompatible preservando el intervalo del repositorio", async () => {
    const now = new Date("2026-08-31T12:00:00.000Z")
    const observedAt = new Date("2026-08-31T11:55:00.000Z")
    mocks.supportsCatalogSync.mockReturnValue(false)
    mocks.getOrCreateErpSyncConfig.mockResolvedValue({
      enabled: true,
      intervalMinutes: 30,
      nextRunAt: new Date("2026-08-31T12:30:00.000Z"),
      updatedAt: observedAt,
    })
    mocks.disableErpSyncSchedule.mockResolvedValue({
      enabled: false,
      intervalMinutes: 120,
      nextRunAt: null,
    })

    await expect(getErpSyncSchedule(now)).resolves.toEqual({
      enabled: false,
      intervalMinutes: 120,
      nextRunAt: null,
    })
    expect(mocks.disableErpSyncSchedule).toHaveBeenCalledWith(observedAt)
    expect(mocks.saveErpSyncConfig).not.toHaveBeenCalled()
  })

  it("no reescribe una programación incompatible que ya está inactiva y limpia", async () => {
    mocks.supportsCatalogSync.mockReturnValue(false)
    mocks.getOrCreateErpSyncConfig.mockResolvedValue({
      enabled: false,
      intervalMinutes: 60,
      nextRunAt: null,
    })

    await expect(getErpSyncSchedule()).resolves.toEqual({
      enabled: false,
      intervalMinutes: 60,
      nextRunAt: null,
    })
    expect(mocks.disableErpSyncSchedule).not.toHaveBeenCalled()
  })

  it("limpia un vencimiento residual aunque la programación incompatible ya esté inactiva", async () => {
    const observedAt = new Date("2026-08-31T11:55:00.000Z")
    mocks.supportsCatalogSync.mockReturnValue(false)
    mocks.getOrCreateErpSyncConfig.mockResolvedValue({
      enabled: false,
      intervalMinutes: 60,
      nextRunAt: new Date("2026-08-31T12:30:00.000Z"),
      updatedAt: observedAt,
    })
    mocks.disableErpSyncSchedule.mockResolvedValue({
      enabled: false,
      intervalMinutes: 60,
      nextRunAt: null,
    })

    await expect(getErpSyncSchedule()).resolves.toEqual({
      enabled: false,
      intervalMinutes: 60,
      nextRunAt: null,
    })
    expect(mocks.disableErpSyncSchedule).toHaveBeenCalledWith(observedAt)
  })

  it("solo ejecuta una vez cuando dos disparadores compiten por el mismo vencimiento", async () => {
    const config = {
      id: "default",
      enabled: true,
      intervalMinutes: 30,
      nextRunAt: new Date("2026-08-06T12:30:00.000Z"),
      createdAt: new Date("2026-08-06T12:00:00.000Z"),
      updatedAt: new Date("2026-08-06T12:00:00.000Z"),
    }
    mocks.getOrCreateErpSyncConfig.mockResolvedValue(config)
    mocks.claimDueErpSync.mockResolvedValueOnce(config).mockResolvedValueOnce(null)
    mocks.syncCatalogFromERP.mockResolvedValue({ success: true, processedCount: 7 })

    const results = await Promise.all([runDueErpSync(), runDueErpSync()])

    expect(results.filter((result) => result.executed)).toHaveLength(1)
    expect(mocks.syncCatalogFromERP).toHaveBeenCalledOnce()
    expect(mocks.syncCatalogFromERP).toHaveBeenCalledWith("AUTO")
  })

  it("omite sin tocar el ERP cuando está inactiva o aún no vence", async () => {
    mocks.getOrCreateErpSyncConfig.mockResolvedValue({ enabled: false })
    mocks.claimDueErpSync.mockResolvedValue(null)

    await expect(runDueErpSync()).resolves.toEqual({
      executed: false,
      reason: "disabled_or_not_due",
    })
    expect(mocks.syncCatalogFromERP).not.toHaveBeenCalled()
  })

  it("omite un tick incompatible antes de reclamar o registrar una sincronización", async () => {
    const observedAt = new Date("2026-08-31T11:55:00.000Z")
    mocks.supportsCatalogSync.mockReturnValue(false)
    mocks.getOrCreateErpSyncConfig.mockResolvedValue({
      enabled: true,
      intervalMinutes: 30,
      nextRunAt: new Date("2026-08-31T11:30:00.000Z"),
      updatedAt: observedAt,
    })
    mocks.disableErpSyncSchedule.mockResolvedValue({
      enabled: false,
      intervalMinutes: 30,
      nextRunAt: null,
    })

    await expect(runDueErpSync()).resolves.toEqual({
      executed: false,
      reason: "catalog_sync_unavailable",
    })
    expect(mocks.disableErpSyncSchedule).toHaveBeenCalledWith(observedAt)
    expect(mocks.claimDueErpSync).not.toHaveBeenCalled()
    expect(mocks.syncCatalogFromERP).not.toHaveBeenCalled()
  })

  it("rechaza una frecuencia manipulada antes de persistir", async () => {
    await expect(
      updateErpSyncSchedule({ enabled: true, intervalMinutes: 45 } as never)
    ).rejects.toThrow("frecuencia")

    expect(mocks.saveErpSyncConfig).not.toHaveBeenCalled()
  })

  it("rechaza activar el automático cuando el adaptador no soporta catálogo", async () => {
    mocks.supportsCatalogSync.mockReturnValue(false)

    await expect(
      updateErpSyncSchedule({ enabled: true, intervalMinutes: 60 })
    ).rejects.toThrow("no ofrece sincronización de catálogo")

    expect(mocks.saveErpSyncConfig).not.toHaveBeenCalled()
  })

  it("serializa la configuración persistida para el panel", async () => {
    mocks.getOrCreateErpSyncConfig.mockResolvedValue({
      enabled: true,
      intervalMinutes: 720,
      nextRunAt: new Date("2026-08-07T00:00:00.000Z"),
    })

    await expect(getErpSyncSchedule()).resolves.toEqual({
      enabled: true,
      intervalMinutes: 720,
      nextRunAt: "2026-08-07T00:00:00.000Z",
    })
  })

  it("valida, guarda y serializa una configuración permitida", async () => {
    mocks.saveErpSyncConfig.mockResolvedValue({
      enabled: false,
      intervalMinutes: 60,
      nextRunAt: null,
    })

    await expect(
      updateErpSyncSchedule(
        { enabled: false, intervalMinutes: 60 },
        new Date("2026-08-06T12:00:00.000Z")
      )
    ).resolves.toEqual({ enabled: false, intervalMinutes: 60, nextRunAt: null })

    expect(mocks.saveErpSyncConfig).toHaveBeenCalledWith(
      { enabled: false, intervalMinutes: 60 },
      new Date("2026-08-06T12:00:00.000Z")
    )
  })
})
