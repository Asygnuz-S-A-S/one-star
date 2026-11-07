import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const deps = vi.hoisted(() => ({
  findProductCatalogCandidates: vi.fn(),
  findProductsByIds: vi.fn(),
  getCatalogRules: vi.fn(),
}))

vi.mock("@/server/repositories/product.repository", () => ({
  findProductCatalogCandidates: deps.findProductCatalogCandidates,
  findProductsByIds: deps.findProductsByIds,
}))
vi.mock("../store-settings.service", () => ({ getCatalogRules: deps.getCatalogRules }))
vi.mock("@/server/services/catalog-source.service", () => ({ isErpCatalogOwner: vi.fn(async () => false) }))

import { hasVisibleSaleProducts } from "../product.service"

const rules = { hideImagelessProducts: true, hideEmptySale: true, newArrivalDays: 30, groupColorsInCatalog: true }

beforeEach(() => {
  vi.clearAllMocks()
  deps.findProductsByIds.mockResolvedValue([])
})

describe("hasVisibleSaleProducts", () => {
  it("oculta SALE cuando el interruptor está activo y no hay ofertas visibles", async () => {
    deps.getCatalogRules.mockResolvedValue(rules)
    deps.findProductCatalogCandidates.mockResolvedValue([])
    await expect(hasVisibleSaleProducts()).resolves.toBe(false)
    expect(deps.findProductCatalogCandidates).toHaveBeenCalledWith(expect.objectContaining({ isOnSale: true, isPublished: true }), expect.anything())
  })

  it("muestra SALE si hay al menos una oferta visible", async () => {
    deps.getCatalogRules.mockResolvedValue(rules)
    deps.findProductCatalogCandidates.mockResolvedValue([{ id: "p1", colorFamilyId: null, variants: [{ stock: 2 }], images: [{ id: "i1" }] }])
    await expect(hasVisibleSaleProducts()).resolves.toBe(true)
  })

  it("con el interruptor apagado siempre muestra SALE, sin consultar el catálogo", async () => {
    deps.getCatalogRules.mockResolvedValue({ ...rules, hideEmptySale: false })
    await expect(hasVisibleSaleProducts()).resolves.toBe(true)
    expect(deps.findProductCatalogCandidates).not.toHaveBeenCalled()
  })
})
