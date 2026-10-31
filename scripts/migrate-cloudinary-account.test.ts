import { describe, expect, it } from "vitest"

import { extractCloudinaryUrls, parseCloudinaryUrl } from "./migrate-cloudinary-account"

describe("parseCloudinaryUrl", () => {
  it("quita transformaciones y extensión, y conserva carpeta y versión del original", () => {
    expect(
      parseCloudinaryUrl("https://res.cloudinary.com/viejo/image/upload/f_auto,q_auto,w_384/v1792462166/one-star/productos/abc.jpg", "viejo"),
    ).toEqual({
      resourceType: "image",
      type: "upload",
      publicId: "one-star/productos/abc",
      originalUrl: "https://res.cloudinary.com/viejo/image/upload/v1792462166/one-star/productos/abc.jpg",
    })
  })

  it("sirve sin versión ni transformaciones, y en archivos raw deja la extensión", () => {
    expect(parseCloudinaryUrl("https://res.cloudinary.com/viejo/image/upload/one-star/a_b/foto.webp?x=1", "viejo")?.publicId).toBe("one-star/a_b/foto")
    expect(parseCloudinaryUrl("https://res.cloudinary.com/viejo/raw/upload/v1/legal/terminos.pdf", "viejo")?.publicId).toBe("legal/terminos.pdf")
  })

  it("ignora links de otra cuenta o incompletos", () => {
    expect(parseCloudinaryUrl("https://res.cloudinary.com/nuevo/image/upload/v1/a.jpg", "viejo")).toBeNull()
    expect(parseCloudinaryUrl("https://res.cloudinary.com/viejo/image/upload", "viejo")).toBeNull()
  })
})

describe("extractCloudinaryUrls", () => {
  it("saca los links de la cuenta vieja de JSON, listas y texto libre", () => {
    const json = JSON.stringify({ hero: "https://res.cloudinary.com/viejo/image/upload/v1/a.jpg", otro: "https://res.cloudinary.com/nuevo/image/upload/v1/b.jpg" })
    expect(extractCloudinaryUrls(json, "viejo")).toEqual(["https://res.cloudinary.com/viejo/image/upload/v1/a.jpg"])
    expect(extractCloudinaryUrls('{"https://res.cloudinary.com/viejo/image/upload/v1/c.jpg"}', "viejo")).toEqual(["https://res.cloudinary.com/viejo/image/upload/v1/c.jpg"])
    expect(extractCloudinaryUrls("Mira (https://res.cloudinary.com/viejo/image/upload/v1/d.png).", "viejo")).toEqual(["https://res.cloudinary.com/viejo/image/upload/v1/d.png"])
  })
})
