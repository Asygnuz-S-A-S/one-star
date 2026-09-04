import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/store-settings.repository", () => ({
  findStoreSettings: vi.fn(),
  updateStoreSettingsRecord: vi.fn(),
}))

import {
  getMetaConversionsCredentials,
  getMetaPixelPublicConfig,
  getStoreSettings,
  updateMetaPixelSettings,
} from "../store-settings.service"
import {
  findStoreSettings,
  updateStoreSettingsRecord,
} from "@/server/repositories/store-settings.repository"

const mockFind = vi.mocked(findStoreSettings)
const mockUpdate = vi.mocked(updateStoreSettingsRecord)

const rawSettings = {
  id: "default",
  storeName: "One Star",
  contactEmail: "hola@onestar.co",
  whatsapp: "+573001234567",
  metaPixelId: "123456789012345",
  metaAccessToken: "EAAB-secret-token-9876",
  metaTestEventCode: "TEST1",
  metaPixelEnabled: true,
  updatedAt: new Date("2026-09-04T00:00:00Z"),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFind.mockResolvedValue(rawSettings)
  mockUpdate.mockResolvedValue(rawSettings)
})

describe("getStoreSettings", () => {
  it("nunca expone el token completo, solo una pista", async () => {
    const dto = await getStoreSettings()

    expect(dto.hasMetaAccessToken).toBe(true)
    expect(dto.metaAccessTokenHint).toBe("9876")
    expect(JSON.stringify(dto)).not.toContain("EAAB-secret")
  })
})

describe("updateMetaPixelSettings", () => {
  const input = {
    enabled: true,
    pixelId: "123456789012345",
    accessToken: null,
    clearAccessToken: false,
    testEventCode: null,
  }

  it("conserva el token guardado cuando el campo llega vacío", async () => {
    await updateMetaPixelSettings(input)

    expect(mockUpdate).toHaveBeenCalledWith({
      metaPixelEnabled: true,
      metaPixelId: "123456789012345",
      metaTestEventCode: null,
    })
  })

  it("reemplaza el token cuando llega uno nuevo", async () => {
    await updateMetaPixelSettings({ ...input, accessToken: "nuevo-token" })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ metaAccessToken: "nuevo-token" }),
    )
  })

  it("borra el token cuando se pide explícitamente, aunque llegue uno nuevo", async () => {
    await updateMetaPixelSettings({
      ...input,
      accessToken: "nuevo-token",
      clearAccessToken: true,
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ metaAccessToken: null }),
    )
  })
})

describe("getMetaPixelPublicConfig", () => {
  it("devuelve solo el ID cuando el píxel está activo", async () => {
    await expect(getMetaPixelPublicConfig()).resolves.toEqual({
      pixelId: "123456789012345",
    })
  })

  it("devuelve null si el píxel está desactivado", async () => {
    mockFind.mockResolvedValue({ ...rawSettings, metaPixelEnabled: false })

    await expect(getMetaPixelPublicConfig()).resolves.toBeNull()
  })

  it("devuelve null si falta el ID aunque esté activado", async () => {
    mockFind.mockResolvedValue({ ...rawSettings, metaPixelId: null })

    await expect(getMetaPixelPublicConfig()).resolves.toBeNull()
  })
})

describe("getMetaConversionsCredentials", () => {
  it("entrega ID, token y código de prueba cuando todo está configurado", async () => {
    await expect(getMetaConversionsCredentials()).resolves.toEqual({
      pixelId: "123456789012345",
      accessToken: "EAAB-secret-token-9876",
      testEventCode: "TEST1",
    })
  })

  it("devuelve null sin token", async () => {
    mockFind.mockResolvedValue({ ...rawSettings, metaAccessToken: null })

    await expect(getMetaConversionsCredentials()).resolves.toBeNull()
  })

  it("devuelve null con el píxel desactivado aunque haya token", async () => {
    mockFind.mockResolvedValue({ ...rawSettings, metaPixelEnabled: false })

    await expect(getMetaConversionsCredentials()).resolves.toBeNull()
  })
})
