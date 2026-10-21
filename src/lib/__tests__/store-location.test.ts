import { describe, expect, it } from "vitest"

import {
  STORE_LOCATION_PENDING,
  getStoreDirectionsUrl,
  getVariantStoreStock,
  isStoreLocationPending,
  normalizeStoreName,
  resolveStoreCoordinates,
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

describe("resolveStoreCoordinates", () => {
  it("respeta coordenadas válidas ya configuradas en la BD", () => {
    const coords = resolveStoreCoordinates({
      name: "Sede de Prueba",
      latitude: 6.2001,
      longitude: -75.5701,
    })
    expect(coords).toEqual({ lat: 6.2001, lng: -75.5701 })
  })

  it("resuelve coordenadas exactas para One Star Unicentro", () => {
    const coords = resolveStoreCoordinates({
      name: "One Star Unicentro",
      address: "Cra. 66B #34A-76, Local 220",
      city: "Medellín",
      latitude: null,
      longitude: null,
    })
    expect(coords).toEqual({ lat: 6.2408625, lng: -75.587071 })
  })

  it("resuelve coordenadas exactas para One Star Fundadores", () => {
    const coords = resolveStoreCoordinates({
      name: "One Star Fundadores",
      address: "Cl. 50 #46-36, Centro Comercial Fundadores",
      city: "Medellín",
      latitude: null,
      longitude: null,
    })
    expect(coords).toEqual({ lat: 6.25143, lng: -75.56452 })
  })

  it("resuelve coordenadas exactas para One Star Centro", () => {
    const coords = resolveStoreCoordinates({
      name: "One Star Centro",
      address: "Cra. 50 #50-20, La Candelaria",
      city: "Medellín",
      latitude: null,
      longitude: null,
    })
    expect(coords).toEqual({ lat: 6.25052, lng: -75.56781 })
  })

  it("usa fallback de ciudad si la sede es desconocida pero la ciudad existe", () => {
    const coords = resolveStoreCoordinates({
      name: "One Star Laureles",
      city: "Medellín",
      latitude: null,
      longitude: null,
    })
    expect(coords).toEqual({ lat: 6.244203, lng: -75.581212 })
  })

  it("devuelve null si no se puede determinar", () => {
    expect(resolveStoreCoordinates(null)).toBeNull()
    expect(resolveStoreCoordinates({ name: "Tienda Desconocida", city: "Tokio" })).toBeNull()
  })
})

describe("getStoreDirectionsUrl", () => {
  it("genera URL directa con lat/lng cuando las coordenadas se resuelven", () => {
    const url = getStoreDirectionsUrl({
      name: "One Star Unicentro",
      address: "Cra. 66B #34A-76",
      city: "Medellín",
    })
    expect(url).toBe("https://www.google.com/maps/dir/?api=1&destination=6.2408625,-75.587071")
  })

  it("genera URL con query si no hay coordenadas", () => {
    const url = getStoreDirectionsUrl({
      name: "Tienda X",
      address: "Calle 1",
      city: "Tokio",
    })
    expect(url).toContain("destination=Tienda%20X%2C%20Calle%201%2C%20Tokio")
  })
})
