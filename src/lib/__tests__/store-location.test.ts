import { describe, it, expect } from "vitest"
import { resolveStoreCoordinates, getStoreDirectionsUrl } from "../store-location"

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
