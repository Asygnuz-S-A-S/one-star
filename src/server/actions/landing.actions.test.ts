import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/server/auth/require-admin", () => ({ requireSuperAdmin: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/server/services/landing-section.service", () => ({
  createLandingSection: vi.fn(),
  deleteLandingSection: vi.fn(),
  setLandingSectionActive: vi.fn(),
  updateLandingSectionConfig: vi.fn(),
  updateLandingSectionPositions: vi.fn(),
}))

import { updateLandingSectionConfigAction } from "./landing.actions"
import { updateLandingSectionConfig } from "@/server/services/landing-section.service"

beforeEach(() => vi.clearAllMocks())

describe("updateLandingSectionConfigAction", () => {
  it("devuelve el motivo seguro y accionable si falta el texto alternativo de una imagen responsive", async () => {
    const result = await updateLandingSectionConfigAction("hero-1", {
      version: 1,
      kind: "campaignHero",
      headline: "Nueva campaña",
      accent: "carbon",
      primaryCta: { label: "Ver colección", href: "/productos" },
      desktopMedia: { src: "https://res.cloudinary.com/demo/image/upload/hero-web.jpg", alt: "" },
      tabletMedia: { src: "https://res.cloudinary.com/demo/image/upload/hero-tablet.jpg", alt: "Tenis para tablet" },
      mobileMedia: { src: "https://res.cloudinary.com/demo/image/upload/hero-mobile.jpg", alt: "Tenis para móvil" },
    })

    expect(result).toEqual({ success: false, error: "El texto alternativo de la imagen Web / escritorio es obligatorio" })
    expect(updateLandingSectionConfig).not.toHaveBeenCalled()
  })

  it("guarda el slide aunque el producto en primer plano tenga texto pero no link", async () => {
    const slide = { id: "campaign-1", accent: "carbon", headline: "Domina tu terreno", primaryCta: { label: "Comprar HOKA", href: "/marcas/hoka" } }
    const result = await updateLandingSectionConfigAction("hero-1", {
      version: 1,
      kind: "campaignHero",
      slides: [{ ...slide, foregroundMedia: { src: "", alt: "Domina tu terreno" } }],
    })

    expect(result).toEqual({ success: true })
    expect(updateLandingSectionConfig).toHaveBeenCalledWith("hero-1", { version: 1, kind: "campaignHero", slides: [slide] })
  })

  it("dice qué botón y qué slide no tienen destino", async () => {
    const result = await updateLandingSectionConfigAction("hero-1", {
      version: 1,
      kind: "campaignHero",
      slides: [
        { id: "a", accent: "carbon", headline: "Uno", primaryCta: { label: "Ver", href: "/productos" } },
        { id: "b", accent: "carbon", headline: "Dos", primaryCta: { label: "Ver", href: "/productos" }, secondaryCta: { label: "Ver todo", href: "" } },
      ],
    })

    expect(result).toEqual({ success: false, error: "Falta el destino del segundo botón del slide 2" })
  })
})
