import { describe, expect, it } from "vitest"

import {
  DEFAULT_PRODUCT_SORT,
  PRODUCT_SORT_OPTIONS,
  resolveProductSort,
} from "../product-sort"

describe("PRODUCT_SORT_OPTIONS", () => {
  it("incluye precio y alfabético en ambos sentidos", () => {
    const values = PRODUCT_SORT_OPTIONS.map((option) => option.value)

    expect(values).toContain("precio_asc")
    expect(values).toContain("precio_desc")
    expect(values).toContain("az")
    expect(values).toContain("za")
  })

  it("no repite valores ni etiquetas", () => {
    const values = PRODUCT_SORT_OPTIONS.map((o) => o.value)
    const labels = PRODUCT_SORT_OPTIONS.map((o) => o.label)

    expect(new Set(values).size).toBe(values.length)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe("resolveProductSort", () => {
  it("acepta cada criterio declarado", () => {
    for (const { value } of PRODUCT_SORT_OPTIONS) {
      expect(resolveProductSort(value)).toBe(value)
    }
  })

  it("cae al orden por defecto cuando falta o no se reconoce", () => {
    expect(resolveProductSort(undefined)).toBe(DEFAULT_PRODUCT_SORT)
    expect(resolveProductSort("")).toBe(DEFAULT_PRODUCT_SORT)
    expect(resolveProductSort("  ")).toBe(DEFAULT_PRODUCT_SORT)
    expect(resolveProductSort("aleatorio")).toBe(DEFAULT_PRODUCT_SORT)
  })
})
