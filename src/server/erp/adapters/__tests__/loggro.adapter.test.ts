import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { LoggroERPAdapter } from "../loggro.adapter"
import type { LoggroCatalogItem, LoggroClient } from "../loggro.client"

describe("LoggroERPAdapter.fetchCatalog", () => {
  it("consulta stock únicamente para variantes vendibles", async () => {
    const items: LoggroCatalogItem[] = [
      {
        uuid: "parent-1",
        codigo: "MODEL-BLK",
        descripcion: "TENIS MODELO NEGRO",
        definicion: true,
      },
      {
        uuid: "variant-1",
        codigo: "MODEL-BLK_9",
        descripcion: "TENIS MODELO NEGRO",
        definicion: false,
        definidoEn_uuid: "parent-1",
      },
    ]
    const getDisponibilidadSnapshot = vi.fn().mockResolvedValue({
      stockByCodigo: new Map([["MODEL-BLK_9", 4]]),
      complete: true,
      requestedCount: 1,
      resolvedCount: 1,
      missingCodes: [],
      errors: [],
    })
    const client = {
      getProducts: vi.fn().mockResolvedValue(items),
      getDisponibilidadSnapshot,
    } as unknown as LoggroClient
    const adapter = new LoggroERPAdapter("token", client)

    const snapshot = await adapter.fetchCatalog()

    expect(getDisponibilidadSnapshot).toHaveBeenCalledWith(["MODEL-BLK_9"])
    expect(snapshot.groups).toHaveLength(1)
    expect(snapshot.groups[0].variants).toHaveLength(1)
  })

  it("entrega el precio final con IVA a partir del neto de Loggro", async () => {
    const items: LoggroCatalogItem[] = [
      {
        uuid: "variant-1",
        codigo: "MODEL-BLK_9",
        descripcion: "TENIS MODELO NEGRO",
        definicion: false,
        precioDefecto: "100000",
      },
    ]
    const client = {
      getProducts: vi.fn().mockResolvedValue(items),
      getDisponibilidadSnapshot: vi.fn().mockResolvedValue({
        stockByCodigo: new Map([["MODEL-BLK_9", 1]]),
        locations: [],
        stockByCodigoAndLocation: new Map(),
        complete: true,
        requestedCount: 1,
        resolvedCount: 1,
        missingCodes: [],
        errors: [],
      }),
    } as unknown as LoggroClient

    const conIva = await new LoggroERPAdapter("token", client, { ivaRate: 0.19 }).fetchCatalog()
    const sinIva = await new LoggroERPAdapter("token", client, { ivaRate: 0 }).fetchCatalog()

    expect(conIva.groups[0].basePrice).toBe(119_000)
    expect(sinIva.groups[0].basePrice).toBe(100_000)
  })

  it("expone los probes de solo lectura del cliente mediante el contrato genérico", async () => {
    const probes = [
      {
        endpoint: "connection" as const,
        status: "healthy" as const,
        httpStatus: 200,
        latencyMs: 12,
        detail: "API disponible.",
      },
    ]
    const client = { diagnoseEndpoints: vi.fn().mockResolvedValue(probes) } as unknown as LoggroClient
    const adapter = new LoggroERPAdapter("token", client)

    await expect(adapter.diagnoseEndpoints()).resolves.toEqual(probes)
  })
})
