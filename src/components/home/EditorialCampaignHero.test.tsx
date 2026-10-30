import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import EditorialCampaignHero from "./EditorialCampaignHero"

const campaign = {
  version: 1 as const,
  kind: "campaignHero" as const,
  accent: "oneStarRed" as const,
  eyebrow: "Drop 01",
  headline: "Corre diferente",
  copy: "Selección urbana para todos los días.",
  primaryCta: { label: "Ver lanzamientos", href: "/lanzamientos" },
}

describe("EditorialCampaignHero", () => {
  it("renders named campaign CTAs and a stable fallback without media", () => {
    const html = renderToStaticMarkup(<EditorialCampaignHero campaign={campaign} />)

    expect(html).toContain("Corre diferente")
    expect(html).toContain("Ver lanzamientos")
    expect(html).toContain('href="/lanzamientos"')
    expect(html).toContain('data-testid="editorial-hero-fallback"')
    expect(html).not.toMatch(/>CTA</)
  })

  it("renders the optional foreground product layer without removing the primary CTA", () => {
    const html = renderToStaticMarkup(<EditorialCampaignHero campaign={{ ...campaign, desktopMedia: { src: "/desktop.jpg", alt: "Campaña web" }, foregroundMedia: { src: "/shoe.png", alt: "Tenis verde en primer plano" } }} />)

    expect(html).toContain('data-testid="editorial-hero-foreground"')
    expect(html).toContain("Tenis verde en primer plano")
    expect(html).toContain("Ver lanzamientos")
  })

  it("uses the product stage when the campaign only has a cut-out product", () => {
    const html = renderToStaticMarkup(<EditorialCampaignHero campaign={{ ...campaign, foregroundMedia: { src: "/shoe.png", alt: "Tenis verde en primer plano" } }} />)

    expect(html).toContain('data-testid="editorial-hero-stage"')
    expect(html).not.toContain('data-testid="editorial-hero-fallback"')
    expect(html).toContain("Tenis verde en primer plano")
    expect(html).toContain("Ver lanzamientos")
  })

  it("con 8 o más ángulos apila todos los cuadros del giro y muestra solo el primero", () => {
    const angles = Array.from({ length: 9 }, (_, i) => ({ src: `/giro/${i + 1}.png`, alt: "Tenis" }))
    const html = renderToStaticMarkup(<EditorialCampaignHero campaign={{ ...campaign, foregroundMedia: { src: "/giro/0.png", alt: "Tenis girando" }, angles }} />)

    expect(html).toContain('data-testid="editorial-hero-spin"')
    expect(html.match(/<img/g)).toHaveLength(10)
    expect(html.match(/<img[^>]*opacity-100/g)).toHaveLength(1)
    expect(html.match(/<img[^>]*opacity-0/g)).toHaveLength(9)
    expect(html.match(/alt="Tenis girando"/g)).toHaveLength(1)
  })

  it("con pocos ángulos sigue pasando foto por foto, sin giro", () => {
    const angles = [{ src: "/lado.png", alt: "Lado" }, { src: "/atras.png", alt: "Atrás" }]
    const html = renderToStaticMarkup(<EditorialCampaignHero campaign={{ ...campaign, foregroundMedia: { src: "/shoe.png", alt: "Tenis" }, angles }} />)

    expect(html).not.toContain('data-testid="editorial-hero-spin"')
    expect(html.match(/<img/g)).toHaveLength(1)
  })
})

it("renders Web, tablet and mobile campaign art direction without breaking the existing CTA", () => {
  const html = renderToStaticMarkup(<EditorialCampaignHero campaign={{
    ...campaign,
    desktopMedia: { src: "/desktop.jpg", alt: "Campaña web" },
    tabletMedia: { src: "/tablet.jpg", alt: "Campaña tablet" },
    mobileMedia: { src: "/mobile.jpg", alt: "Campaña móvil" },
  }} />)

  expect(html).toContain('data-testid="editorial-hero-media"')
  expect(html).toContain('media="(min-width: 1024px)"')
  expect(html).toContain('media="(min-width: 641px)"')
  expect(html).toContain("%2Fdesktop.jpg")
  expect(html).toContain("%2Ftablet.jpg")
  expect(html).toContain("%2Fmobile.jpg")
  expect(html).toContain("Ver lanzamientos")
})

it("uses the existing desktop asset as the fallback for a legacy single-media campaign", () => {
  const html = renderToStaticMarkup(<EditorialCampaignHero campaign={{
    ...campaign,
    desktopMedia: { src: "/legacy-hero.jpg", alt: "Campaña existente" },
  }} />)

  expect(html).toContain('data-testid="editorial-hero-media"')
  expect(html).toContain("%2Flegacy-hero.jpg")
  expect(html).not.toContain('data-testid="editorial-hero-fallback"')
})

it("renders an accessible carousel for multiple editorial slides with the first slide visible", () => {
  const html = renderToStaticMarkup(<EditorialCampaignHero campaign={{
    ...campaign,
    slides: [
      { id: "first", ...campaign },
      { id: "second", ...campaign, headline: "Segundo drop" },
    ],
  }} />)

  expect(html).toContain('aria-roledescription="carousel"')
  expect(html).toContain("Anterior")
  expect(html).toContain("Siguiente")
  expect(html).toContain("Ir al slide 2: Segundo drop")
  expect(html).toContain("Corre diferente")
})
