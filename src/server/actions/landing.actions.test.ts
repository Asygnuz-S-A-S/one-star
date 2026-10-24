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
})
