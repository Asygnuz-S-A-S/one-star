import { describe, expect, it } from "vitest"

import { buildStoreMapEmbedUrl } from "../ClientStoreMap"

describe("buildStoreMapEmbedUrl", () => {
  it("centra el mapa en las coordenadas exactas cuando existen", () => {
    expect(buildStoreMapEmbedUrl({ lat: 5.07, lng: -75.51 }, "ignorado")).toBe(
      "https://maps.google.com/maps?ll=5.07%2C-75.51&t=m&z=16&hl=es&output=embed"
    )
  })

  it("busca la dirección en Google cuando no hay coordenadas", () => {
    const url = buildStoreMapEmbedUrl(null, "One Star Unicentro, C.C. Unicentro, local C-45, Pereira")
    expect(url).toContain(`q=${encodeURIComponent("One Star Unicentro, C.C. Unicentro, local C-45, Pereira")}`)
    expect(url).not.toContain("ll=")
  })
})
