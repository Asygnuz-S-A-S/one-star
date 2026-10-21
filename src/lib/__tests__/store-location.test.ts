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

  it("no adivina coordenadas por nombre de sede ni por ciudad", () => {
    expect(
      resolveStoreCoordinates({ name: "One Star Unicentro", address: "C.C. Unicentro, local C-45", city: "Pereira", latitude: null, longitude: null })
    ).toBeNull()
    expect(
      resolveStoreCoordinates({ name: "One Star Fundadores", address: "C.C. Fundadores, local 158", city: "Manizales" })
    ).toBeNull()
  })

  it("ignora coordenadas en 0,0", () => {
    expect(resolveStoreCoordinates({ name: "Sede", latitude: 0, longitude: 0 })).toBeNull()
  })

  it("devuelve null si no se puede determinar", () => {
    expect(resolveStoreCoordinates(null)).toBeNull()
    expect(resolveStoreCoordinates({ name: "Tienda Desconocida", city: "Tokio" })).toBeNull()
  })
})

describe("getStoreDirectionsUrl", () => {
  it("genera URL directa con lat/lng cuando la tienda tiene coordenadas guardadas", () => {
    const url = getStoreDirectionsUrl({
      name: "One Star Unicentro",
      address: "C.C. Unicentro, local C-45",
      city: "Pereira",
      latitude: 4.81,
      longitude: -75.74,
    })
    expect(url).toBe("https://www.google.com/maps/dir/?api=1&destination=4.81,-75.74")
  })

  it("busca por nombre, dirección y ciudad cuando la tienda no tiene coordenadas", () => {
    const url = getStoreDirectionsUrl({
      name: "One Star Fundadores",
      address: "C.C. Fundadores, local 158",
      city: "Manizales",
    })
    expect(url).toContain(`destination=${encodeURIComponent("One Star Fundadores, C.C. Fundadores, local 158, Manizales")}`)
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
