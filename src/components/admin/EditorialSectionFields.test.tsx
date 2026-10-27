import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CampaignHeroFields, upsertTile } from "./EditorialSectionFields"
import { campaignHeroDefaults } from "@/lib/editorial-builder-form"

describe("CampaignHeroFields", () => {
  it("puts the three responsive media selectors before copy fields", () => {
    const markup = renderToStaticMarkup(
      <CampaignHeroFields
        config={campaignHeroDefaults()}
        onChange={() => undefined}
        onPickMedia={() => undefined}
      />,
    )

    expect(markup.indexOf("Imágenes adaptadas por pantalla")).toBeLessThan(markup.indexOf("Titular *"))
    expect(markup).toContain("Imagen Web / escritorio")
    expect(markup).toContain("Imagen Tablet")
    expect(markup).toContain("Imagen Móvil")
    expect(markup.match(/Biblioteca/g)).toHaveLength(4)
  })
})

describe("upsertTile", () => {
  it("keeps every collection card when editing them one by one", () => {
    const media = { src: "/a.jpg", alt: "A" }
    let tiles = upsertTile([], "hombre", { media })
    tiles = upsertTile(tiles, "mujer", { appearance: "light" })
    tiles = upsertTile(tiles, "hombre", { title: "Hombre" })

    expect(tiles).toEqual([
      { id: "hombre", appearance: "carbon", media, title: "Hombre" },
      { id: "mujer", appearance: "light" },
    ])
  })
})
