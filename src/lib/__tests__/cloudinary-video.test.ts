import { describe, expect, it } from "vitest"
import { stageVideoSources } from "../cloudinary-video"

describe("stageVideoSources", () => {
  const url = "https://res.cloudinary.com/demo/video/upload/v1/one-star/productos/tenis.mp4"

  it("recorta el video de Cloudinary y saca la carátula del primer cuadro", () => {
    expect(stageVideoSources(url)).toEqual({
      src: "https://res.cloudinary.com/demo/video/upload/c_crop,g_center,w_0.72,h_0.6/w_1280,q_auto/v1/one-star/productos/tenis.mp4",
      poster: "https://res.cloudinary.com/demo/video/upload/c_crop,g_center,w_0.72,h_0.6/w_1280,q_auto,so_0/v1/one-star/productos/tenis.jpg",
    })
  })

  it("deja intactos los videos que no son de Cloudinary", () => {
    expect(stageVideoSources("https://cdn.example.com/tenis.mp4")).toEqual({ src: "https://cdn.example.com/tenis.mp4", poster: null })
  })
})
