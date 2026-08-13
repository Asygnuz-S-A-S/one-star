import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/erp", () => ({ getERPAdapter: vi.fn() }))
vi.mock("@/server/db/prisma", () => ({ prisma: {} }))
vi.mock("@/server/repositories/product-color.repository", () => ({
  findManyProductColors: vi.fn().mockResolvedValue([]),
}))
vi.mock("@/server/repositories/erp-sync-log.repository", () => ({
  createErpSyncLog: vi.fn().mockResolvedValue(undefined),
  findRecentErpSyncLogs: vi.fn().mockResolvedValue([]),
}))
vi.mock("@/server/repositories/erp-catalog.repository", () => ({
  countCatalogBrandsBySlug: vi.fn(),
  createCatalogBrand: vi.fn(),
  createCatalogProduct: vi.fn(),
  createCatalogVariant: vi.fn(),
  createDefaultImportCategory: vi.fn(),
  findCatalogBrandByErpId: vi.fn(),
  findCatalogBrandBySlug: vi.fn(),
  findCatalogProductBySlug: vi.fn(),
  findDefaultImportCategory: vi.fn(),
  updateCatalogBrandErpId: vi.fn(),
  updateCatalogProduct: vi.fn(),
  updateCatalogVariant: vi.fn(),
}))
vi.mock("@/server/repositories/erp-color-family.repository", () => ({
  applyErpColorFamilyKeyUpdates: vi.fn().mockResolvedValue({
    reconciliation: { plan: { actions: [], omissions: [], unchangedKeys: [] } },
  }),
}))
vi.mock("@/server/services/erp-sync-scheduler.service", () => ({
  getErpSyncSchedule: vi.fn(),
}))

import { getERPAdapter } from "@/server/erp"
import { createErpSyncLog } from "@/server/repositories/erp-sync-log.repository"
import { findRecentErpSyncLogs } from "@/server/repositories/erp-sync-log.repository"
import { findDefaultImportCategory } from "@/server/repositories/erp-catalog.repository"
import { applyErpColorFamilyKeyUpdates } from "@/server/repositories/erp-color-family.repository"
import { getErpSyncSchedule } from "@/server/services/erp-sync-scheduler.service"
import { getErpSyncStatus, runErpEndpointDiagnostics, syncCatalogFromERP } from "../erp-sync.service"

const mockGetERPAdapter = vi.mocked(getERPAdapter)
const mockCreateErpSyncLog = vi.mocked(createErpSyncLog)
const mockFindRecentErpSyncLogs = vi.mocked(findRecentErpSyncLogs)
const mockFindDefaultImportCategory = vi.mocked(findDefaultImportCategory)
const mockApplyColorFamilyKeys = vi.mocked(applyErpColorFamilyKeyUpdates)
const mockGetErpSyncSchedule = vi.mocked(getErpSyncSchedule)

describe("syncCatalogFromERP", () => {
  afterEach(() => vi.useRealTimers())

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.ERP_CATALOG_WRITES_ENABLED
    mockGetErpSyncSchedule.mockResolvedValue({
      enabled: true,
      intervalMinutes: 30,
      nextRunAt: "2026-08-06T12:30:00.000Z",
    })
  })

  it("expone la configuración automática persistida en el DTO del panel", async () => {
    mockGetERPAdapter.mockReturnValue({ ping: vi.fn().mockResolvedValue(true) } as never)
    mockFindRecentErpSyncLogs.mockResolvedValue([])
    mockGetErpSyncSchedule.mockResolvedValue({
      enabled: false,
      intervalMinutes: 120,
      nextRunAt: null,
    })

    const status = await getErpSyncStatus()

    expect(status).toMatchObject({
      autoSyncEnabled: false,
      autoSyncMinutes: 120,
      nextAutoSyncAt: null,
    })
  })

  it("bloquea escrituras cuando Loggro responde stock completo pero todo en cero", async () => {
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "parent-1",
            sku: "MODEL-BLK",
            name: "TENIS MODELO NEGRO",
            basePrice: 100_000,
            variants: [
              {
                erpId: "variant-1",
                sku: "MODEL-BLK_9",
                name: "TENIS MODELO NEGRO",
                basePrice: 100_000,
                stock: 0,
              },
            ],
          },
        ],
        diagnostics: {
          sourceItemCount: 2,
          definitionCount: 1,
          variantCount: 1,
          groupCount: 1,
        },
        stock: {
          status: "all_zero",
          complete: true,
          requestedCount: 1,
          resolvedCount: 1,
          totalStock: 0,
          missingCodes: [],
          errors: [],
        },
      }),
      ping: vi.fn(),
    } as never)

    const result = await syncCatalogFromERP("MANUAL", { dryRun: false })

    expect(result).toMatchObject({
      success: false,
      processedCount: 0,
      productCount: 1,
      variantCount: 1,
    })
    expect(result.error).toContain("stock total en cero")
  })

  it("dry-run valida y cuenta el catálogo sin escribir ni siquiera el historial", async () => {
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "parent-1",
            sku: "MODEL-BLK",
            name: "TENIS MODELO NEGRO",
            basePrice: 100_000,
            variants: [
              {
                erpId: "variant-1",
                sku: "MODEL-BLK_9",
                name: "TENIS MODELO NEGRO",
                basePrice: 100_000,
                stock: 2,
              },
            ],
          },
        ],
        diagnostics: {
          sourceItemCount: 2,
          definitionCount: 1,
          variantCount: 1,
          groupCount: 1,
        },
        stock: {
          status: "complete",
          complete: true,
          requestedCount: 1,
          resolvedCount: 1,
          totalStock: 2,
          missingCodes: [],
          errors: [],
        },
      }),
      ping: vi.fn(),
    } as never)

    const result = await syncCatalogFromERP("MANUAL", { dryRun: true })

    expect(result).toMatchObject({
      success: true,
      dryRun: true,
      productCount: 1,
      variantCount: 1,
      definitionCount: 1,
    })
    expect(mockCreateErpSyncLog).not.toHaveBeenCalled()
  })

  it("rechaza una segunda sincronización mientras otra sigue en curso", async () => {
    let releaseFetch: ((value: unknown) => void) | undefined
    const fetchCatalog = vi.fn().mockImplementation(
      () => new Promise((resolve) => { releaseFetch = resolve })
    )
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog,
      ping: vi.fn(),
    } as never)

    const firstSync = syncCatalogFromERP("AUTO")
    await vi.waitFor(() => expect(fetchCatalog).toHaveBeenCalledTimes(1))

    const secondResult = await syncCatalogFromERP("MANUAL")

    expect(secondResult.success).toBe(false)
    expect(secondResult.error).toContain("ya hay una sincronización")
    expect(fetchCatalog).toHaveBeenCalledTimes(1)

    releaseFetch?.({
      groups: [],
      diagnostics: {
        sourceItemCount: 0,
        definitionCount: 0,
        variantCount: 0,
        groupCount: 0,
      },
      stock: {
        status: "partial",
        complete: false,
        requestedCount: 0,
        resolvedCount: 0,
        totalStock: 0,
        missingCodes: [],
        errors: [],
      },
    })
    await firstSync
  })

  it("reporta productos y variantes por separado en dry-run", async () => {
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "parent-1",
            sku: "MODEL-BLK",
            name: "TENIS MODELO NEGRO",
            basePrice: 100_000,
            variants: [
              { erpId: "v-1", sku: "MODEL-BLK_9", name: "MODELO", basePrice: 100_000, stock: 1 },
              { erpId: "v-2", sku: "MODEL-BLK_10", name: "MODELO", basePrice: 100_000, stock: 1 },
            ],
          },
        ],
        diagnostics: {
          sourceItemCount: 3,
          definitionCount: 1,
          variantCount: 2,
          groupCount: 1,
        },
        stock: {
          status: "complete",
          complete: true,
          requestedCount: 2,
          resolvedCount: 2,
          totalStock: 2,
          missingCodes: [],
          errors: [],
        },
      }),
      ping: vi.fn(),
    } as never)

    const result = await syncCatalogFromERP("MANUAL", { dryRun: true })

    expect(result).toMatchObject({
      processedCount: 1,
      productCount: 1,
      variantCount: 2,
    })
  })

  it("mantiene pausadas las escrituras hasta habilitarlas explícitamente", async () => {
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "parent-1",
            sku: "MODEL-BLK",
            name: "TENIS MODELO NEGRO",
            basePrice: 100_000,
            variants: [
              { erpId: "v-1", sku: "MODEL-BLK_9", name: "MODELO", basePrice: 100_000, stock: 2 },
            ],
          },
        ],
        diagnostics: {
          sourceItemCount: 2,
          definitionCount: 1,
          variantCount: 1,
          groupCount: 1,
        },
        stock: {
          status: "complete",
          complete: true,
          requestedCount: 1,
          resolvedCount: 1,
          totalStock: 2,
          missingCodes: [],
          errors: [],
        },
      }),
      ping: vi.fn(),
    } as never)

    const result = await syncCatalogFromERP("AUTO")

    expect(result.success).toBe(false)
    expect(result.error).toContain("escrituras del catálogo están pausadas")
    expect(mockFindDefaultImportCategory).not.toHaveBeenCalled()
  })

  it("reconcilia las claves opacas después de sincronizar productos y variantes", async () => {
    process.env.ERP_CATALOG_WRITES_ENABLED = "true"
    mockFindDefaultImportCategory.mockResolvedValue({ id: "category" } as never)
    const repository = await import("@/server/repositories/erp-catalog.repository")
    vi.mocked(repository.findCatalogProductBySlug).mockResolvedValue({
      id: "product-a",
      variants: [
        { id: "variant-a", sku: "180361GRN_8", size: "8", color: "Verde" },
      ],
    } as never)
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "erp-a",
            sku: "180361GRN",
            name: "SKECHERS VERDE",
            basePrice: 100_000,
            colorFamilyKey: "loggro:004:180361",
            variants: [
              {
                erpId: "variant-erp-a",
                sku: "180361GRN_8",
                name: "SKECHERS VERDE",
                basePrice: 100_000,
                stock: 2,
              },
            ],
          },
        ],
        diagnostics: {
          sourceItemCount: 2,
          definitionCount: 1,
          variantCount: 1,
          groupCount: 1,
        },
        stock: {
          status: "complete",
          complete: true,
          requestedCount: 1,
          resolvedCount: 1,
          totalStock: 2,
          missingCodes: [],
          errors: [],
        },
      }),
      ping: vi.fn(),
    } as never)

    await syncCatalogFromERP("MANUAL")

    expect(mockApplyColorFamilyKeys).toHaveBeenCalledWith([
      { productId: "product-a", key: "loggro:004:180361" },
    ])
  })

  it("completa el género de un producto ERP existente que aún no está clasificado", async () => {
    process.env.ERP_CATALOG_WRITES_ENABLED = "true"
    mockFindDefaultImportCategory.mockResolvedValue({ id: "category" } as never)
    const repository = await import("@/server/repositories/erp-catalog.repository")
    vi.mocked(repository.findCatalogProductBySlug).mockResolvedValue({
      id: "product-women",
      gender: null,
      variants: [],
    } as never)
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "erp-women",
            sku: "WOMEN-GRN",
            name: "TENIS SKECHERS MUJER VERDE",
            gender: "MUJER",
            basePrice: 100_000,
            variants: [
              {
                erpId: "variant-women",
                sku: "WOMEN-GRN_8",
                name: "TENIS SKECHERS MUJER VERDE",
                basePrice: 100_000,
                stock: 2,
              },
            ],
          },
        ],
        diagnostics: {
          sourceItemCount: 2,
          definitionCount: 1,
          variantCount: 1,
          groupCount: 1,
        },
        stock: {
          status: "complete",
          complete: true,
          requestedCount: 1,
          resolvedCount: 1,
          totalStock: 2,
          missingCodes: [],
          errors: [],
        },
      }),
      ping: vi.fn(),
    } as never)

    await syncCatalogFromERP("MANUAL")

    expect(repository.updateCatalogProduct).toHaveBeenCalledWith(
      "product-women",
      expect.objectContaining({ gender: "MUJER" })
    )
  })

  it("sanea el error antes de persistirlo y devolverlo", async () => {
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockRejectedValue(
        new Error("Bearer secret-token https://user:pass@api.loggro.com/items?token=abc")
      ),
      ping: vi.fn(),
    } as never)

    const result = await syncCatalogFromERP("MANUAL")

    expect(result.error).toContain("[REDACTADO]")
    expect(result.error).not.toContain("secret-token")
    expect(result.error).not.toContain("user:pass")
    expect(mockCreateErpSyncLog).toHaveBeenCalledWith(
      expect.objectContaining({ error: result.error })
    )
  })

  it("sanea también los errores históricos al construir el DTO del panel", async () => {
    mockGetERPAdapter.mockReturnValue({ ping: vi.fn().mockResolvedValue(true) } as never)
    mockFindRecentErpSyncLogs.mockResolvedValue([
      {
        id: "log-1",
        provider: "loggro",
        trigger: "AUTO",
        success: false,
        processedCount: 0,
        error: "token=historical-secret",
        durationMs: 50,
        createdAt: new Date("2026-08-06T12:00:00Z"),
      },
    ] as never)

    const status = await getErpSyncStatus()

    expect(status.last?.error).toContain("[REDACTADO]")
    expect(status.last?.error).not.toContain("historical-secret")
  })

  it("conserva resultados parciales del diagnóstico y sanea cada detalle", async () => {
    mockGetERPAdapter.mockReturnValue({
      ping: vi.fn(),
      diagnoseEndpoints: vi.fn().mockResolvedValue([
        {
          endpoint: "connection",
          status: "healthy",
          httpStatus: 200,
          latencyMs: 8,
          detail: "Bearer secret connection ok",
        },
        {
          endpoint: "stock",
          status: "error",
          httpStatus: 503,
          latencyMs: 30,
          detail: "token=private stock unavailable",
        },
      ]),
    } as never)

    const result = await runErpEndpointDiagnostics()

    expect(result.results).toHaveLength(3)
    expect(result.results.map((probe) => probe.endpoint)).toEqual([
      "connection",
      "catalog",
      "stock",
    ])
    expect(result.results[0].detail).not.toContain("secret")
    expect(result.results[1]).toMatchObject({ endpoint: "catalog", status: "error" })
    expect(result.results[2]).toMatchObject({ endpoint: "stock", httpStatus: 503 })
    expect(result.results[2].detail).not.toContain("private")
  })

  it("informa que el diagnóstico detallado no está soportado por el adaptador", async () => {
    mockGetERPAdapter.mockReturnValue({ ping: vi.fn() } as never)

    const result = await runErpEndpointDiagnostics()

    expect(result.results).toHaveLength(3)
    expect(result.results.every((probe) => probe.status === "unsupported")).toBe(true)
  })

  it("convierte un fallo general del adaptador en tres resultados seguros", async () => {
    mockGetERPAdapter.mockReturnValue({
      ping: vi.fn(),
      diagnoseEndpoints: vi.fn().mockRejectedValue(new Error("token=private")),
    } as never)

    const result = await runErpEndpointDiagnostics()

    expect(result.results).toHaveLength(3)
    expect(result.results.every((probe) => probe.status === "error")).toBe(true)
    expect(result.results.every((probe) => !probe.detail.includes("private"))).toBe(true)
  })

  it("normaliza duplicados, faltantes y campos runtime inválidos a tres probes seguros", async () => {
    mockGetERPAdapter.mockReturnValue({
      ping: vi.fn(),
      diagnoseEndpoints: vi.fn().mockResolvedValue([
        {
          endpoint: "connection",
          status: "healthy",
          httpStatus: 200,
          latencyMs: 5,
          detail: "Conexión válida.",
        },
        {
          endpoint: "connection",
          status: "healthy",
          httpStatus: 200,
          latencyMs: 6,
          detail: "Duplicado.",
        },
        {
          endpoint: "stock",
          status: "inventado",
          httpStatus: 999,
          latencyMs: Number.NaN,
          detail: { raw: "private" },
        },
        {
          endpoint: "unknown",
          status: "healthy",
          httpStatus: 200,
          latencyMs: 1,
          detail: "No debe salir",
        },
      ]),
    } as never)

    const result = await runErpEndpointDiagnostics()

    expect(result.results.map((probe) => probe.endpoint)).toEqual([
      "connection",
      "catalog",
      "stock",
    ])
    expect(result.results.every((probe) => probe.status === "error")).toBe(true)
    expect(result.results.every((probe) => probe.httpStatus === null)).toBe(true)
    expect(result.results.every((probe) => probe.latencyMs === 0)).toBe(true)
    expect(JSON.stringify(result)).not.toContain("private")
    expect(JSON.stringify(result)).not.toContain("unknown")
  })

  it("asigna checkedAt cuando finaliza el adaptador", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-06T12:00:00.000Z"))
    mockGetERPAdapter.mockReturnValue({
      ping: vi.fn(),
      diagnoseEndpoints: vi.fn().mockImplementation(async () => {
        vi.setSystemTime(new Date("2026-08-06T12:00:05.000Z"))
        return []
      }),
    } as never)

    const result = await runErpEndpointDiagnostics()

    expect(result.checkedAt).toBe("2026-08-06T12:00:05.000Z")
    vi.useRealTimers()
  })

  it("rechaza una segunda ejecución concurrente sin invocar dos veces el adaptador", async () => {
    let release: ((value: unknown[]) => void) | undefined
    const diagnoseEndpoints = vi.fn().mockImplementation(
      () => new Promise<unknown[]>((resolve) => { release = resolve })
    )
    mockGetERPAdapter.mockReturnValue({ ping: vi.fn(), diagnoseEndpoints } as never)

    const first = runErpEndpointDiagnostics()
    await vi.waitFor(() => expect(diagnoseEndpoints).toHaveBeenCalledOnce())
    const second = await runErpEndpointDiagnostics()

    expect(diagnoseEndpoints).toHaveBeenCalledOnce()
    expect(second.results).toHaveLength(3)
    expect(second.results.every((probe) => probe.status === "error")).toBe(true)

    release?.([])
    await first
  })
})
