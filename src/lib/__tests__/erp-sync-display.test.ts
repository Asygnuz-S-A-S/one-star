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

import { countConsecutiveFailures, getErpIndicators, isErpConfigured } from "../erp-sync-display"

describe("countConsecutiveFailures", () => {
  it("cuenta desde la corrida más reciente hasta el primer éxito", () => {
    expect(countConsecutiveFailures([])).toBe(0)
    expect(countConsecutiveFailures([{ success: true }, { success: false }])).toBe(0)
    expect(
      countConsecutiveFailures([{ success: false }, { success: false }, { success: true }, { success: false }])
    ).toBe(2)
  })
})

describe("getErpIndicators", () => {
  const base = {
    provider: "loggro",
    connected: true,
    catalogSyncAvailable: true,
    autoSyncEnabled: true,
    intervalLabel: "Cada 30 minutos",
    history: [{ success: true }],
  }

  it("no muestra nada en verde cuando no hay ERP configurado, aunque el ping responda", () => {
    expect(isErpConfigured("null")).toBe(false)
    const result = getErpIndicators({ ...base, provider: "null", connected: true })
    expect(result.api).toMatchObject({ tone: "off", label: "No configurado" })
    expect(result.autoSync).toMatchObject({ tone: "off", label: "No disponible" })
  })

  it("marca la programación activa como con errores cuando las corridas fallan", () => {
    const result = getErpIndicators({
      ...base,
      history: [{ success: false }, { success: false }, { success: false }, { success: true }],
    })
    expect(result.consecutiveFailures).toBe(3)
    expect(result.autoSync).toMatchObject({ tone: "error", label: "Activa con errores" })
    expect(result.autoSync.detail).toContain("3 fallos seguidos")
    expect(result.lastSync).toMatchObject({ tone: "error", label: "Con error" })
  })

  it("solo pone verde cuando el ERP responde y la última corrida fue correcta", () => {
    const result = getErpIndicators(base)
    expect(result.api).toMatchObject({ tone: "ok", label: "Responde" })
    expect(result.autoSync).toEqual({ tone: "ok", label: "Activa", detail: "Cada 30 minutos" })
    expect(result.lastSync).toMatchObject({ tone: "ok" })
  })

  it("distingue sin respuesta, inactiva, sin catálogo y sin corridas", () => {
    expect(getErpIndicators({ ...base, connected: false }).api).toMatchObject({
      tone: "error",
      label: "Sin respuesta",
    })
    expect(getErpIndicators({ ...base, autoSyncEnabled: false }).autoSync).toMatchObject({
      tone: "off",
      label: "Inactiva",
    })
    expect(getErpIndicators({ ...base, catalogSyncAvailable: false }).autoSync).toMatchObject({
      tone: "off",
      label: "No disponible",
    })
    const fresh = getErpIndicators({ ...base, history: [] })
    expect(fresh.autoSync).toMatchObject({ tone: "warn", label: "Activa, sin corridas" })
    expect(fresh.lastSync).toBeNull()
  })
})
