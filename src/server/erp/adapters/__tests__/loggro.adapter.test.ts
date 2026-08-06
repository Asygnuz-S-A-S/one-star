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
})
