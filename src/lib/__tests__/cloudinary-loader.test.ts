import { describe, expect, it } from "vitest"
import cloudinaryLoader from "../cloudinary-loader"

describe("cloudinaryLoader", () => {
  it("transforma URLs de Cloudinary insertando f_auto,q_auto,w_{width} tras /image/upload/", () => {
    const original = "https://res.cloudinary.com/onestar/image/upload/v1234567/products/chuck-taylor.jpg"
    const result = cloudinaryLoader({ src: original, width: 640 })
    expect(result).toBe(
      "https://res.cloudinary.com/onestar/image/upload/f_auto,q_auto,w_640/v1234567/products/chuck-taylor.jpg"
    )
  })

  it("funciona con URLs de Cloudinary sin versión", () => {
    const original = "https://res.cloudinary.com/onestar/image/upload/products/sample.png"
    const result = cloudinaryLoader({ src: original, width: 320 })
    expect(result).toBe(
      "https://res.cloudinary.com/onestar/image/upload/f_auto,q_auto,w_320/products/sample.png"
    )
  })

  it("reemplaza transformaciones de ancho previas generadas por el loader", () => {
    const transformed =
      "https://res.cloudinary.com/onestar/image/upload/f_auto,q_auto,w_640/v1234567/products/chuck-taylor.jpg"
    const result = cloudinaryLoader({ src: transformed, width: 1080 })
    expect(result).toBe(
      "https://res.cloudinary.com/onestar/image/upload/f_auto,q_auto,w_1080/v1234567/products/chuck-taylor.jpg"
    )
  })

  it("deja intactas las rutas locales", () => {
    const local = "/placeholder-product.svg"
    expect(cloudinaryLoader({ src: local, width: 400 })).toBe(local)
  })

  it("deja intactas URLs externas que no son de Cloudinary", () => {
    const unsplash = "https://images.unsplash.com/photo-1542291026-7eec264c27ff"
    expect(cloudinaryLoader({ src: unsplash, width: 800 })).toBe(unsplash)

    const nike = "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/sample.jpg"
    expect(cloudinaryLoader({ src: nike, width: 500 })).toBe(nike)
  })
})
