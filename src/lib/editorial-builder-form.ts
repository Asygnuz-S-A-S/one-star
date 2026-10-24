import type { CampaignHeroConfig, CollectionTileConfig, EditorialAppearance } from "@/lib/editorial-config"

export const EDITORIAL_DESTINATIONS = [
  ["/", "Inicio"],
  ["/productos", "Catálogo"],
  ["/lanzamientos", "Lanzamientos"],
  ["/sale", "Sale"],
  ["/accesorios", "Accesorios"],
  ["/tarjeta-regalo", "Tarjeta regalo"],
  ["/club", "One Star Club"],
] as const

export const EDITORIAL_APPEARANCES: Array<{ value: EditorialAppearance; label: string }> = [
  { value: "light", label: "Claro" },
  { value: "carbon", label: "Carbón" },
  { value: "oneStarRed", label: "One Star rojo" },
]

export function campaignHeroDefaults(): CampaignHeroConfig {
  return {
    version: 1,
    kind: "campaignHero",
    accent: "carbon",
    headline: "Nueva campaña",
    primaryCta: { label: "Ver colección", href: "/productos" },
    slides: [{
      id: "campaign-1",
      accent: "carbon",
      headline: "Nueva campaña",
      primaryCta: { label: "Ver colección", href: "/productos" },
    }],
  }
}

export function collectionTileDefaults(): CollectionTileConfig {
  return {
    version: 1,
    kind: "collectionTile",
    tiles: [{ id: "coleccion", title: "Colección", href: "/productos", appearance: "carbon" }],
  }
}
