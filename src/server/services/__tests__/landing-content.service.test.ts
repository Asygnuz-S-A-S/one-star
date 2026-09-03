import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/navigation.repository", () => ({
  getAllNavigationItems: vi.fn(),
  getMaximumNavigationPosition: vi.fn(),
  createNavigationItem: vi.fn(),
  updateNavigationItem: vi.fn(),
  deleteNavigationItem: vi.fn(),
  updateNavigationPositions: vi.fn(),
}))

vi.mock("@/server/repositories/top-banner.repository", () => ({
  getTopBanner: vi.fn(),
  updateTopBanner: vi.fn(),
}))

import {
  createNavigationItem,
  updateNavigationItem,
} from "@/server/services/navigation.service"
import { updateTopBanner } from "@/server/services/top-banner.service"
import * as navigationRepository from "@/server/repositories/navigation.repository"
import * as topBannerRepository from "@/server/repositories/top-banner.repository"

describe("navigation.service", () => {
  beforeEach(() => vi.clearAllMocks())

  it("crea una URL libre al final del menú", async () => {
    vi.mocked(navigationRepository.getMaximumNavigationPosition).mockResolvedValue(4)
    vi.mocked(navigationRepository.createNavigationItem).mockResolvedValue({
      id: "nav-1",
      label: "Campaña",
      href: "https://example.com/campana",
      isSale: false,
      position: 5,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await createNavigationItem({
      label: "Campaña",
      href: "https://example.com/campana",
      isSale: false,
    })

    expect(navigationRepository.createNavigationItem).toHaveBeenCalledWith({
      label: "Campaña",
      href: "https://example.com/campana",
      isSale: false,
      position: 5,
    })
  })

  it("permite editar la URL de un enlace existente", async () => {
    await updateNavigationItem("nav-1", {
      label: "Lanzamientos",
      href: "/lanzamientos/nuevos",
      isSale: false,
    })

    expect(navigationRepository.updateNavigationItem).toHaveBeenCalledWith("nav-1", {
      label: "Lanzamientos",
      href: "/lanzamientos/nuevos",
      isSale: false,
    })
  })

  it("rechaza esquemas ejecutables en navegación", async () => {
    vi.mocked(navigationRepository.getMaximumNavigationPosition).mockResolvedValue(0)

    await expect(createNavigationItem({
      label: "Inseguro",
      href: "javascript:alert(1)",
      isSale: false,
    })).rejects.toThrow("Usa una ruta interna o una URL http/https")

    expect(navigationRepository.createNavigationItem).not.toHaveBeenCalled()
  })
})

describe("top-banner.service", () => {
  beforeEach(() => vi.clearAllMocks())

  it("normaliza el fallback antiguo usando el primer mensaje", async () => {
    await updateTopBanner({
      text: "",
      btnText: "Ver oferta",
      btnUrl: "/sale",
      messages: [{ text: "Envío gratis", url: "/envios" }],
      bgColor: "#000000",
      textColor: "#FFFFFF",
      isActive: true,
    })

    expect(topBannerRepository.updateTopBanner).toHaveBeenCalledWith({
      text: "Envío gratis",
      btnText: "Ver oferta",
      btnUrl: "/sale",
      messages: [{ text: "Envío gratis", url: "/envios" }],
      bgColor: "#000000",
      textColor: "#FFFFFF",
      isActive: true,
    })
  })

  it("rechaza guardar un banner sin mensajes", async () => {
    await expect(updateTopBanner({
      text: "",
      messages: [],
      bgColor: "#000000",
      textColor: "#FFFFFF",
      isActive: true,
    })).rejects.toThrow("Agrega al menos un mensaje promocional")

    expect(topBannerRepository.updateTopBanner).not.toHaveBeenCalled()
  })
})
