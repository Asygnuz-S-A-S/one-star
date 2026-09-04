import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/server/services/category.service", () => ({
  getCategories: vi.fn(),
}))
vi.mock("@/server/services/product.service", () => ({
  getProductSitemapEntries: vi.fn(),
}))

import sitemap from "@/app/sitemap"
import { getCategories } from "@/server/services/category.service"
import { getProductSitemapEntries } from "@/server/services/product.service"

const getCategoriesMock = vi.mocked(getCategories)
const getProductSitemapEntriesMock = vi.mocked(getProductSitemapEntries)

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_APP_URL = "https://onestar.com.co"
})

describe("sitemap", () => {
  it("incluye rutas estáticas, categorías y productos publicados", async () => {
    getCategoriesMock.mockResolvedValue([
      { id: "cat-1", name: "Hombre", slug: "hombre" },
    ])
    getProductSitemapEntriesMock.mockResolvedValue([
      { slug: "nike-air-force-1-07", updatedAt: new Date("2026-08-01T00:00:00Z") },
    ])

    const entries = await sitemap()
    const urls = entries.map((entry) => entry.url)

    expect(urls).toContain("https://onestar.com.co/")
    expect(urls).toContain("https://onestar.com.co/terminos")
    expect(urls).toContain("https://onestar.com.co/privacidad")
    expect(urls).toContain("https://onestar.com.co/c/hombre")
    expect(urls).toContain("https://onestar.com.co/productos/nike-air-force-1-07")
  })

  it("no expone rutas privadas ni la búsqueda", async () => {
    getCategoriesMock.mockResolvedValue([])
    getProductSitemapEntriesMock.mockResolvedValue([])

    const urls = (await sitemap()).map((entry) => entry.url)

    for (const path of ["/admin", "/api", "/buscar", "/carrito", "/checkout", "/cuenta"]) {
      expect(urls.some((url) => url.includes(path))).toBe(false)
    }
  })

  it("conserva la fecha de actualización real de cada producto", async () => {
    const updatedAt = new Date("2026-07-15T10:30:00Z")
    getCategoriesMock.mockResolvedValue([])
    getProductSitemapEntriesMock.mockResolvedValue([{ slug: "veja-campo", updatedAt }])

    const producto = (await sitemap()).find((entry) => entry.url.endsWith("/productos/veja-campo"))

    expect(producto?.lastModified).toEqual(updatedAt)
  })

  it("sigue sirviendo las rutas estáticas si la base de datos falla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    getCategoriesMock.mockRejectedValue(new Error("db caída"))
    getProductSitemapEntriesMock.mockRejectedValue(new Error("db caída"))

    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls).toContain("https://onestar.com.co/")
    expect(urls).toContain("https://onestar.com.co/sale")
  })
})
