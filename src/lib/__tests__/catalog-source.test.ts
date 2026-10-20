import { describe, expect, it } from "vitest"
import {
  isErpCatalogOwnerSync,
  isErpProviderConfigured,
  normalizeCatalogSource,
} from "../catalog-source"

describe("catalog-source lib", () => {
  describe("isErpProviderConfigured", () => {
    it("devuelve false si el proveedor es nulo, indefinido, vacío o 'null'", () => {
      expect(isErpProviderConfigured(undefined)).toBe(false)
      expect(isErpProviderConfigured(null)).toBe(false)
      expect(isErpProviderConfigured("")).toBe(false)
      expect(isErpProviderConfigured("   ")).toBe(false)
      expect(isErpProviderConfigured("null")).toBe(false)
      expect(isErpProviderConfigured("undefined")).toBe(false)
    })

    it("devuelve true si el proveedor es un ERP válido configurado", () => {
      expect(isErpProviderConfigured("Loggro")).toBe(true)
      expect(isErpProviderConfigured("Mekano")).toBe(true)
      expect(isErpProviderConfigured("loggro")).toBe(true)
    })
  })

  describe("normalizeCatalogSource", () => {
    it("normaliza 'ERP' sin importar mayúsculas/minúsculas o espacios", () => {
      expect(normalizeCatalogSource("ERP")).toBe("ERP")
      expect(normalizeCatalogSource("erp")).toBe("ERP")
      expect(normalizeCatalogSource(" ERP ")).toBe("ERP")
    })

    it("devuelve 'ARCHIVO' para cualquier otro valor o vacío", () => {
      expect(normalizeCatalogSource("ARCHIVO")).toBe("ARCHIVO")
      expect(normalizeCatalogSource("archivo")).toBe("ARCHIVO")
      expect(normalizeCatalogSource(null)).toBe("ARCHIVO")
      expect(normalizeCatalogSource(undefined)).toBe("ARCHIVO")
      expect(normalizeCatalogSource("OTRO")).toBe("ARCHIVO")
    })
  })

  describe("isErpCatalogOwnerSync", () => {
    it("devuelve true solo si la fuente es ERP Y hay un proveedor ERP configurado", () => {
      expect(isErpCatalogOwnerSync("ERP", "Mekano")).toBe(true)
      expect(isErpCatalogOwnerSync("ERP", "Loggro")).toBe(true)
    })

    it("devuelve false si la fuente es ERP pero el proveedor es null o no está configurado", () => {
      expect(isErpCatalogOwnerSync("ERP", null)).toBe(false)
      expect(isErpCatalogOwnerSync("ERP", "null")).toBe(false)
      expect(isErpCatalogOwnerSync("ERP", "")).toBe(false)
      expect(isErpCatalogOwnerSync("ERP", undefined)).toBe(false)
    })

    it("devuelve false si la fuente es ARCHIVO aun cuando haya un proveedor configurado", () => {
      expect(isErpCatalogOwnerSync("ARCHIVO", "Mekano")).toBe(false)
      expect(isErpCatalogOwnerSync("ARCHIVO", "Loggro")).toBe(false)
      expect(isErpCatalogOwnerSync(null, "Mekano")).toBe(false)
    })
  })
})
