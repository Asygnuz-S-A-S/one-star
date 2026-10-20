import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({
  findStoreSettingsReadOnly: vi.fn(),
  updateCatalogSource: vi.fn(),
}))

vi.mock("@/server/repositories/store-settings.repository", () => ({
  findStoreSettingsReadOnly: mocks.findStoreSettingsReadOnly,
}))

vi.mock("@/server/services/store-settings.service", () => ({
  updateCatalogSource: mocks.updateCatalogSource,
}))

import {
  getActiveCatalogSource,
  isErpCatalogOwner,
  setCatalogSource,
} from "../catalog-source.service"

describe("catalog-source.service", () => {
  const originalEnv = process.env.ERP_PROVIDER

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ERP_PROVIDER = originalEnv
  })

  describe("getActiveCatalogSource", () => {
    it("devuelve 'ARCHIVO' si los settings son nulos o vacíos", async () => {
      mocks.findStoreSettingsReadOnly.mockResolvedValue(null)
      const source = await getActiveCatalogSource()
      expect(source).toBe("ARCHIVO")
    })

    it("devuelve 'ERP' si los settings tienen 'ERP'", async () => {
      mocks.findStoreSettingsReadOnly.mockResolvedValue({ catalogSource: "ERP" })
      const source = await getActiveCatalogSource()
      expect(source).toBe("ERP")
    })

    it("devuelve 'ARCHIVO' si los settings tienen 'ARCHIVO'", async () => {
      mocks.findStoreSettingsReadOnly.mockResolvedValue({ catalogSource: "ARCHIVO" })
      const source = await getActiveCatalogSource()
      expect(source).toBe("ARCHIVO")
    })
  })

  describe("isErpCatalogOwner", () => {
    it("devuelve false si ERP_PROVIDER es null aunque la configuración diga ERP", async () => {
      process.env.ERP_PROVIDER = "null"
      mocks.findStoreSettingsReadOnly.mockResolvedValue({ catalogSource: "ERP" })

      const isOwner = await isErpCatalogOwner()
      expect(isOwner).toBe(false)
    })

    it("devuelve false si la fuente es ARCHIVO aunque haya ERP_PROVIDER configurado", async () => {
      process.env.ERP_PROVIDER = "Mekano"
      mocks.findStoreSettingsReadOnly.mockResolvedValue({ catalogSource: "ARCHIVO" })

      const isOwner = await isErpCatalogOwner()
      expect(isOwner).toBe(false)
    })

    it("devuelve true si la fuente es ERP Y hay ERP_PROVIDER configurado", async () => {
      process.env.ERP_PROVIDER = "Mekano"
      mocks.findStoreSettingsReadOnly.mockResolvedValue({ catalogSource: "ERP" })

      const isOwner = await isErpCatalogOwner()
      expect(isOwner).toBe(true)
    })
  })

  describe("setCatalogSource", () => {
    it("invoca la actualización en store-settings.service", async () => {
      mocks.updateCatalogSource.mockResolvedValue({ catalogSource: "ERP" })
      await setCatalogSource("ERP")
      expect(mocks.updateCatalogSource).toHaveBeenCalledWith("ERP")
    })
  })
})
