import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import SizeGuideModal from "./SizeGuideModal"

describe("SizeGuideModal", () => {
  it("con imagen de la marca la muestra a todo el ancho y ofrece ampliarla, sin un segundo scroll", () => {
    const html = renderToStaticMarkup(
      <SizeGuideModal isOpen onClose={() => {}} brand={{ name: "Vans", sizeGuideImageUrl: "https://res.cloudinary.com/demo/tallas-vans.png" }} />
    )
    expect(html).toContain("Ampliar la guía de tallas")
    expect(html).toContain("tallas-vans.png")
    expect(html).not.toContain("max-h-[60vh]")
  })

  it("sin imagen de la marca muestra la tabla estándar", () => {
    const html = renderToStaticMarkup(<SizeGuideModal isOpen onClose={() => {}} brand={{ name: "Vans" }} />)
    expect(html).toContain("CM (Centímetros)")
    expect(html).not.toContain("Ampliar la guía de tallas")
  })
})
