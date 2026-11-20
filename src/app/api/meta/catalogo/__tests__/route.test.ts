import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({
  getMetaCatalogFeed: vi.fn(),
  getSiteUrl: vi.fn(() => "https://tiendaonestar.com"),
}))

vi.mock("@/server/services/meta-catalog.service", () => ({
  getMetaCatalogFeed: mocks.getMetaCatalogFeed,
}))

vi.mock("@/lib/site-url", () => ({
  getSiteUrl: mocks.getSiteUrl,
}))

import { GET } from "../route"

describe("GET /api/meta/catalogo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.META_CATALOG_TOKEN
  })

  it("falla cerrado (404) si META_CATALOG_TOKEN no está configurada", async () => {
    const res = await GET(new Request("https://tiendaonestar.com/api/meta/catalogo"))
    expect(res.status).toBe(404)
    expect(mocks.getMetaCatalogFeed).not.toHaveBeenCalled()
  })

  it("responde 404 si el token recibido no coincide", async () => {
    process.env.META_CATALOG_TOKEN = "secreto-valido-123"

    const res = await GET(new Request("https://tiendaonestar.com/api/meta/catalogo?token=secreto-invalido"))
    expect(res.status).toBe(404)
    expect(mocks.getMetaCatalogFeed).not.toHaveBeenCalled()
  })

  it("responde 404 si falta el parámetro token pero META_CATALOG_TOKEN está configurada", async () => {
    process.env.META_CATALOG_TOKEN = "secreto-valido-123"

    const res = await GET(new Request("https://tiendaonestar.com/api/meta/catalogo"))
    expect(res.status).toBe(404)
    expect(mocks.getMetaCatalogFeed).not.toHaveBeenCalled()
  })

  it("responde 400 si los parámetros de query son inválidos", async () => {
    process.env.META_CATALOG_TOKEN = "secreto-valido-123"

    const res = await GET(new Request("https://tiendaonestar.com/api/meta/catalogo?token=secreto-valido-123&limit=invalido"))
    expect(res.status).toBe(400)
    expect(mocks.getMetaCatalogFeed).not.toHaveBeenCalled()
  })

  it("responde 200 con el XML y cabeceras adecuadas cuando el token es correcto", async () => {
    process.env.META_CATALOG_TOKEN = "secreto-valido-123"
    mocks.getMetaCatalogFeed.mockResolvedValue({
      xml: '<?xml version="1.0"?><rss><channel></channel></rss>',
      itemCount: 42,
    })

    const res = await GET(new Request("https://tiendaonestar.com/api/meta/catalogo?token=secreto-valido-123"))
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("application/xml; charset=utf-8")
    expect(res.headers.get("x-meta-catalog-items")).toBe("42")
    expect(res.headers.get("cache-control")).toContain("s-maxage=3600")

    const body = await res.text()
    expect(body).toContain("<rss>")
    expect(mocks.getMetaCatalogFeed).toHaveBeenCalledWith("https://tiendaonestar.com", undefined)
  })
})
