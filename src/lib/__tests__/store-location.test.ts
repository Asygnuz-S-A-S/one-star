import { describe, expect, it } from "vitest"

import {
  STORE_LOCATION_PENDING,
  getVariantStoreStock,
  isStoreLocationPending,
  normalizeStoreName,
} from "../store-location"

describe("normalizeStoreName", () => {
  it("iguala el nombre web con el del ERP ignorando marca, acentos y mayúsculas", () => {
    expect(normalizeStoreName("One Star Fundadores")).toBe("fundadores")
    expect(normalizeStoreName("FUNDADORES")).toBe("fundadores")
    expect(normalizeStoreName("Tienda Unicentro - Medellín")).toBe("unicentro medellin")
  })

  it("devuelve vacío cuando solo queda la marca", () => {
    expect(normalizeStoreName("One Star")).toBe("")
  })
})

describe("isStoreLocationPending", () => {
  it("detecta sedes creadas por la sincronización sin dirección real", () => {
    expect(isStoreLocationPending({ address: STORE_LOCATION_PENDING, city: "Medellín" })).toBe(true)
    expect(isStoreLocationPending({ address: "Cra 1 # 2-3", city: "Medellín" })).toBe(false)
  })
})

describe("getVariantStoreStock", () => {
  const store = (id: string, name: string, extra: Partial<{ isActive: boolean; isWebWarehouse: boolean }> = {}) => ({
    id,
    name,
    city: "Medellín",
    isActive: true,
    isWebWarehouse: false,
    ...extra,
  })

  it("lista solo sedes activas con existencias, de mayor a menor", () => {
    const result = getVariantStoreStock([
      { storeLocationId: "a", stock: 1, storeLocation: store("a", "Centro") },
      { storeLocationId: "b", stock: 4, storeLocation: store("b", "Fundadores") },
      { storeLocationId: "c", stock: 0, storeLocation: store("c", "Unicentro") },
      { storeLocationId: "d", stock: 9, storeLocation: store("d", "Oculta", { isActive: false }) },
      { storeLocationId: "e", stock: 9, storeLocation: store("e", "Web", { isWebWarehouse: true }) },
      { storeLocationId: null, stock: 7, storeLocation: null },
    ])

    expect(result.map((entry) => `${entry.name}:${entry.stock}`)).toEqual([
      "Fundadores:4",
      "Centro:1",
    ])
  })

  it("tolera variantes sin inventario cargado", () => {
    expect(getVariantStoreStock(undefined)).toEqual([])
  })
})
