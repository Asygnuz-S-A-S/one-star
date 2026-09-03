import { describe, expect, it } from "vitest"

import { formatErpSyncCount, getErpErrorPresentation } from "../erp-sync-display"

describe("formatErpSyncCount", () => {
  it("distingue productos y variantes en resultados nuevos y registros ERP en el historial legado", () => {
    expect(
      formatErpSyncCount({ processedCount: 367, productCount: 367, variantCount: 1530 })
    ).toBe("367 productos · 1530 variantes")
    expect(formatErpSyncCount({ processedCount: 1897 })).toBe("1897 registros ERP")
  })
})

describe("getErpErrorPresentation", () => {
  it("explica el bloqueo por inventario completamente en cero", () => {
    expect(
      getErpErrorPresentation(
        "Loggro respondió con stock total en cero para todo el catálogo. La sincronización se bloqueó."
      )
    ).toEqual({
      title: "El inventario del ERP llegó en cero",
      explanation: expect.stringContaining("API puede estar respondiendo"),
      action: expect.stringContaining("existencias"),
    })
  })

  it("clasifica resultados parciales y ofrece un fallback estable", () => {
    expect(getErpErrorPresentation("La consulta de stock fue parcial (10/20 SKU).")).toMatchObject({
      title: "La consulta de inventario quedó incompleta",
      action: expect.stringContaining("bodegas"),
    })
    expect(getErpErrorPresentation(null)).toEqual({
      title: "La sincronización falló",
      explanation: "El ERP no entregó un detalle adicional.",
      action: expect.stringContaining("Probar endpoints"),
    })
  })

  it.each([
    ["El ERP devolvió 0 productos.", "El ERP no devolvió productos"],
    [
      "Las escrituras del catálogo están pausadas mientras se valida.",
      "Las actualizaciones del catálogo están pausadas",
    ],
    ["Ya hay una sincronización del catálogo en curso.", "Ya hay una sincronización en curso"],
    ["Fallo no clasificado", "La sincronización falló"],
  ])("clasifica %s", (error, title) => {
    expect(getErpErrorPresentation(error).title).toBe(title)
  })
})
