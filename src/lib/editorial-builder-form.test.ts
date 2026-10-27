import { describe, expect, it } from "vitest"
import { campaignHeroDefaults, collectionTileDefaults } from "./editorial-builder-form"

describe("editorial builder defaults", () => {
  it("creates a publishable Campaign Hero with named CTA and internal destination", () => {
    expect(campaignHeroDefaults()).toMatchObject({
      version: 1,
      kind: "campaignHero",
      accent: "carbon",
      primaryCta: { label: "Ver colección", href: "/productos" },
    })
  })
})

it("creates a collection tile understood by the public renderer", async () => {
  const { parseEditorialConfig } = await import("./editorial-config")
  expect(parseEditorialConfig(collectionTileDefaults())).toMatchObject({
    kind: "collectionTile",
    tiles: [{ appearance: "carbon" }],
  })
})

it("keeps a collection title and internal destination for rendering", async () => {
  const { parseEditorialConfig } = await import("./editorial-config")
  expect(parseEditorialConfig(collectionTileDefaults())).toMatchObject({
    tiles: [{ title: "Colección", href: "/productos" }],
  })
})
