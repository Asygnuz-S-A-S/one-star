import { describe, expect, it } from "vitest"

import { MAX_HERO_ANGLES, parseEditorialConfig, resolveCollectionTiles } from "./editorial-config"

describe("editorial configuration", () => {
  it("maps a v1 campaign hero without changing the source configuration", () => {
    const config = {
      version: 1,
      kind: "campaignHero",
      eyebrow: "Drop 01",
      headline: "Corre diferente",
      copy: "Selección para la calle.",
      primaryCta: { label: "Ver lanzamientos", href: "/lanzamientos" },
      secondaryCta: { label: "Accesorios", href: "/c/accesorios" },
      desktopMedia: { src: "/hero.jpg", alt: "Tenis verdes One Star" },
      accent: "oneStarRed",
    }

    const result = parseEditorialConfig(config)

    expect(result).toMatchObject({
      kind: "campaignHero",
      headline: "Corre diferente",
      primaryCta: { label: "Ver lanzamientos", href: "/lanzamientos" },
    })
    expect(result).not.toBe(config)
    expect(config).toEqual(expect.objectContaining({ kind: "campaignHero" }))
  })

  it("keeps legacy configuration on the legacy rendering path", () => {
    expect(parseEditorialConfig({ title: "Promos", ctaText: "Ver detalles" })).toEqual({ kind: "legacy" })
  })

  it("falls back safely for an unknown or invalid editorial payload", () => {
    expect(parseEditorialConfig({ version: 1, kind: "campaignHero", headline: "Solo título" })).toEqual({ kind: "legacy" })
    expect(parseEditorialConfig({ version: 1, kind: "futureBlock" })).toEqual({ kind: "legacy" })
  })

  it("maps configured collection media by unchanged block identifiers", () => {
    const tiles = resolveCollectionTiles({
      version: 1,
      kind: "collectionTile",
      tiles: [{ id: "sale", media: { src: "/sale.jpg", alt: "Ofertas One Star" }, appearance: "carbon" }],
    })

    expect(tiles.get("sale")).toEqual({
      alt: "Ofertas One Star",
      appearance: "carbon",
      src: "/sale.jpg",
    })
  })
})

it("preserves a tablet asset while keeping single-media campaigns compatible", () => {
  const responsive = parseEditorialConfig({
    version: 1,
    kind: "campaignHero",
    headline: "Drop",
    accent: "carbon",
    primaryCta: { label: "Comprar", href: "/productos" },
    desktopMedia: { src: "/desktop.jpg", alt: "Campaña en escritorio" },
    tabletMedia: { src: "/tablet.jpg", alt: "Campaña en tablet" },
    mobileMedia: { src: "/mobile.jpg", alt: "Campaña en móvil" },
  })

  expect(responsive).toMatchObject({
    tabletMedia: { src: "/tablet.jpg", alt: "Campaña en tablet" },
  })
  expect(parseEditorialConfig({
    version: 1,
    kind: "campaignHero",
    headline: "Campaña existente",
    accent: "carbon",
    primaryCta: { label: "Ver", href: "/productos" },
    desktopMedia: { src: "/legacy.jpg", alt: "Campaña existente" },
  })).toMatchObject({
    desktopMedia: { src: "/legacy.jpg", alt: "Campaña existente" },
  })
})

it("parses an editorial campaign carousel while keeping legacy single campaigns valid", () => {
  const result = parseEditorialConfig({
    version: 1,
    kind: "campaignHero",
    slides: [
      { id: "drop-1", headline: "Primer drop", accent: "carbon", primaryCta: { label: "Comprar", href: "/productos" } },
      { id: "drop-2", headline: "Segundo drop", accent: "oneStarRed", primaryCta: { label: "Ver sale", href: "/sale" } },
    ],
  })

  expect(result).toMatchObject({ kind: "campaignHero", slides: [{ id: "drop-1" }, { id: "drop-2" }] })
})

describe("ángulos del giro 360", () => {
  it("acepta hasta MAX_HERO_ANGLES fotos por slide y descarta el resto", () => {
    const angles = Array.from({ length: 80 }, (_, i) => `https://res.cloudinary.com/demo/image/upload/giro/${i}.png`)
    const config = parseEditorialConfig({
      version: 1,
      kind: "campaignHero",
      slides: [{ headline: "Tecton X 3", primaryCta: { label: "Comprar", href: "/marcas/hoka" }, angles }],
    })

    expect(MAX_HERO_ANGLES).toBe(72)
    expect(config.kind === "campaignHero" && config.slides?.[0]?.angles).toHaveLength(72)
  })
})

describe("modo de movimiento del producto", () => {
  it("guarda solo modos válidos", () => {
    const slide = (spinMode: unknown) => parseEditorialConfig({ version: 1, kind: "campaignHero", slides: [{ headline: "Mafate 5", primaryCta: { label: "Comprar", href: "/productos" }, spinMode }] })
    const mode = (spinMode: unknown) => { const config = slide(spinMode); return config.kind === "campaignHero" ? config.slides?.[0]?.spinMode : "error" }

    expect(mode("mouse")).toBe("mouse")
    expect(mode("static")).toBe("static")
    expect(mode("volar")).toBeUndefined()
  })
})
