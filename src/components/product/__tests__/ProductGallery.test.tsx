import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => <img src={src} alt={alt} className={className} />,
}))

import ProductGallery from "../ProductGallery"

const images = [
  { id: "a", url: "/a.jpg", alt: "Vista lateral", position: 0 },
  { id: "b", url: "/b.jpg", alt: "Vista superior", position: 1 },
]

describe("ProductGallery", () => {
  it("arranca sin zoom y con cursor de lupa para ampliar con un clic", () => {
    const html = renderToStaticMarkup(<ProductGallery images={images as never} />)
    expect(html).toContain('data-zoomed="false"')
    expect(html).toContain("cursor-zoom-in")
  })

  it("solo muestra la foto activa (ya no cambia al pasar el mouse)", () => {
    const html = renderToStaticMarkup(<ProductGallery images={images as never} />)
    expect(html).toMatch(/alt="Vista lateral" class="[^"]*opacity-100/)
    expect(html).toMatch(/alt="Vista superior" class="[^"]*opacity-0/)
  })
})
