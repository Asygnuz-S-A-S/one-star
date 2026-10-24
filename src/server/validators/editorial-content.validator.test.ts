import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { EditorialContentConfigSchema } from "./editorial-content.validator"

describe("EditorialContentConfigSchema", () => {
  const hero = {
    version: 1,
    kind: "campaignHero",
    headline: "Nuevos lanzamientos",
    accent: "carbon",
    primaryCta: { label: "Ver lanzamientos", href: "/lanzamientos" },
    desktopMedia: { src: "/hero.jpg", alt: "Tenis nuevos" },
  }

  it("acepta un hero editorial con una ruta interna", () => {
    expect(EditorialContentConfigSchema.parse(hero)).toEqual(hero)
  })

  it("rechaza un CTA sin pareja y destinos inseguros", () => {
    expect(() => EditorialContentConfigSchema.parse({
      ...hero,
      primaryCta: { label: "Comprar", href: "javascript:alert(1)" },
      secondaryCta: { label: "Ver más" },
    })).toThrow()
  })

  it("solo acepta las apariencias aprobadas y texto alternativo para media", () => {
    expect(() => EditorialContentConfigSchema.parse({
      ...hero,
      accent: "#E31C23",
      desktopMedia: { src: "/hero.jpg", alt: "" },
    })).toThrow()
  })

  it("acepta un bloque editorial y una colección con destino interno", () => {
    expect(EditorialContentConfigSchema.parse({
      version: 1,
      kind: "editorialBlock",
      title: "La cultura One Star",
      appearance: "light",
      cta: { label: "Conócenos", href: "/nosotros" },
    }).kind).toBe("editorialBlock")

    expect(EditorialContentConfigSchema.parse({
      version: 1,
      kind: "collectionTile",
      tiles: [{ id: "sale", appearance: "oneStarRed", href: "/sale", title: "Sale" }],
    }).kind).toBe("collectionTile")
  })
})

it("conserva el recurso específico de tablet para el Hero", () => {
  const parsed = EditorialContentConfigSchema.parse({
    version: 1,
    kind: "campaignHero",
    headline: "Nuevos lanzamientos",
    accent: "carbon",
    primaryCta: { label: "Ver lanzamientos", href: "/lanzamientos" },
    tabletMedia: { src: "/hero-tablet.jpg", alt: "Tenis nuevos en tablet" },
  })

  expect(parsed).toMatchObject({
    tabletMedia: { src: "/hero-tablet.jpg", alt: "Tenis nuevos en tablet" },
  })
})

it("acepta hasta ocho slides editoriales con copy y CTA independientes", () => {
  expect(EditorialContentConfigSchema.parse({
    version: 1,
    kind: "campaignHero",
    slides: [
      { id: "drop-1", headline: "Drop uno", accent: "carbon", primaryCta: { label: "Comprar", href: "/productos" } },
      { id: "drop-2", headline: "Drop dos", accent: "oneStarRed", primaryCta: { label: "Ver sale", href: "/sale" } },
    ],
  }).kind).toBe("campaignHero")
})
