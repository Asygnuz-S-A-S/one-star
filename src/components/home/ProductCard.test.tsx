import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }))

import ProductCard from "./ProductCard"

describe("ProductCard", () => {
  it("carga solo la foto principal hasta que se interactúa con la tarjeta", () => {
    const html = renderToStaticMarkup(
      <ProductCard id="p1" slug="tenis" name="Tenis" brand="Vans" price={100000} imageUrl="/a.jpg" secondaryImageUrl="/b.jpg" gallery={["/c.jpg", "/d.jpg"]} />
    )
    expect(html.match(/vista \d/g)).toEqual(["vista 1"])
  })
})
