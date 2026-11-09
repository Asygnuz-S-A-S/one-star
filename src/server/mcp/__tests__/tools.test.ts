import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/server/auth/require-admin", () => ({ requireAdmin: vi.fn(async () => ({ user: { id: "adm_1" } })) }))
vi.mock("@/app/admin/productos/actions")
vi.mock("@/app/admin/marcas/actions")
vi.mock("@/server/actions/category.actions")
vi.mock("@/server/actions/product-color.actions")
vi.mock("@/server/actions/banner.actions")
vi.mock("@/server/actions/top-banner.actions")
vi.mock("@/server/actions/media-asset.actions")
vi.mock("@/server/actions/landing.actions")
vi.mock("@/server/services/product.service")
vi.mock("@/server/services/category.service")
vi.mock("@/server/services/brand.service")
vi.mock("@/server/services/product-color.service")
vi.mock("@/server/services/store.service")
vi.mock("@/server/services/catalog-source.service")
vi.mock("@/server/services/banner.service")
vi.mock("@/server/services/top-banner.service")
vi.mock("@/server/services/landing-section.service")
vi.mock("@/server/services/media-asset.service")
vi.mock("@/server/storage/storage.container")
vi.mock("@/server/validators/landing-section.validator", async () => {
  const { z } = await import("zod")
  return { LandingSectionTypeSchema: z.enum(["HERO", "CATEGORY_GRID"]), LandingPageSchema: z.string() }
})

import { MCP_TOOLS, productFormData } from "../tools"
import { updateProduct } from "@/app/admin/productos/actions"
import { createBanner, toggleBannerActive } from "@/server/actions/banner.actions"
import { createLandingSectionAction, toggleLandingSectionActiveAction, updateLandingSectionConfigAction, publishLandingPageAction } from "@/server/actions/landing.actions"
import { getProductByIdForAdmin } from "@/server/services/product.service"
import { getStoreLocations } from "@/server/services/store.service"
import { isErpCatalogOwner } from "@/server/services/catalog-source.service"
import { getStorageAdapter } from "@/server/storage/storage.container"

const byName = (name: string) => {
  const found = MCP_TOOLS.find((t) => t.name === name)
  if (!found) throw new Error(`falta ${name}`)
  return async (args: unknown) => found.run(found.input.parse(args) as never)
}

const product = {
  id: "p1", name: "Hoka Clifton", slug: "hoka-clifton", brandId: "b1", gender: "unisex", categoryId: "c1",
  description: "Viejo", extendedDescription: null, videoUrl: null, basePrice: 500000, isOnSale: false, salePrice: null,
  metaTitle: null, metaDescription: null, availableOnline: true, availableInStores: true, isPublished: true,
  highlights: ["Ligero"], faqs: [{ q: "¿Talla?", a: "Normal" }],
  images: [{ id: "i1", url: "https://res.cloudinary.com/x/a.jpg", alt: "a", position: 0, color: null }],
  variants: [{
    id: "v1", sku: "SKU-1", size: "40", color: "Negro", stock: 3, sizeUS: null, sizeCM: null, sizeEUR: null,
    inventory: [{ storeLocationId: null, stock: 3 }, { storeLocationId: "s-erp", stock: 7 }, { storeLocationId: "s-local", stock: 2 }],
  }],
  crossSells: [{ id: "p9" }],
  colorFamily: { id: "f1", products: [{ id: "p1" }, { id: "p2" }] },
}
const stores = [{ id: "s-erp", erpId: "E1" }, { id: "s-local", erpId: null }]

describe("herramientas MCP", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(updateProduct).mockResolvedValue({ success: true, id: "p1" })
    vi.mocked(getProductByIdForAdmin).mockResolvedValue(product as never)
    vi.mocked(getStoreLocations).mockResolvedValue(stores as never)
    vi.mocked(isErpCatalogOwner).mockResolvedValue(true)
  })

  it("es una lista blanca sin datos de clientes", () => {
    const forbidden = /pedido|\border|cliente|customer|lead|pqrs|newsletter|usuario|cupon|regalo|borrar|eliminar|delete/i
    for (const t of MCP_TOOLS) expect(t.name).not.toMatch(forbidden)
    expect(new Set(MCP_TOOLS.map((t) => t.name)).size).toBe(MCP_TOOLS.length)
    expect(MCP_TOOLS.every((t) => t.area === "inventory" || t.area === "superadmin")).toBe(true)
  })

  it("publicar y guardar borrador son pasos separados", () => {
    const tool = (name: string) => MCP_TOOLS.find((t) => t.name === name)!
    expect(tool("guardar_borrador_seccion")).toMatchObject({ live: false, area: "superadmin" })
    expect(tool("publicar_pagina")).toMatchObject({ live: true, area: "superadmin" })
    expect(tool("ver_pagina").area).toBe("superadmin")
  })

  it("editar_producto cambia solo lo pedido y conserva variantes, inventario y relaciones", async () => {
    await byName("editar_producto")({ id: "p1", cambios: { description: "Nuevo", basePrice: 450000 } })
    const fd = vi.mocked(updateProduct).mock.calls[0][1]
    expect(fd.get("description")).toBe("Nuevo")
    expect(fd.get("basePrice")).toBe("450000")
    expect(fd.get("name")).toBe("Hoka Clifton")
    expect(fd.get("isPublished")).toBe("true")
    expect(fd.get("highlights")).toBe("Ligero")
    expect(fd.get("faqs")).toContain("¿Talla?")
    expect(JSON.parse(fd.get("crossSellIds") as string)).toEqual(["p9"])
    expect(JSON.parse(fd.get("colorFamilyProductIds") as string)).toEqual(["p2"])
    expect(JSON.parse(fd.get("colorFamilyBaselineProductIds") as string)).toEqual(["p2"])
    expect(JSON.parse(fd.get("images") as string)).toEqual([{ id: "i1", url: "https://res.cloudinary.com/x/a.jpg", alt: "a", position: 0, color: null }])
    // Igual que ProductForm: con el ERP como dueño, su sede no se envía (la escribe la sincronización).
    expect(JSON.parse(fd.get("variants") as string)).toEqual([expect.objectContaining({
      sku: "SKU-1", size: "40", color: "Negro", stock: 3,
      inventory: [{ storeLocationId: null, stock: 3 }, { storeLocationId: "s-local", stock: 2 }],
    })])
  })

  it("sin ERP dueño envía todas las sedes, y las fotos nuevas reemplazan en orden", () => {
    const fd = productFormData(product as never, stores, false, {
      images: [{ url: "https://res.cloudinary.com/x/b.jpg" }, { url: "https://res.cloudinary.com/x/c.jpg", color: "Negro" }],
    })
    expect(JSON.parse(fd.get("variants") as string)[0].inventory).toHaveLength(3)
    expect(JSON.parse(fd.get("images") as string)).toEqual([
      { url: "https://res.cloudinary.com/x/b.jpg", alt: "Hoka Clifton", position: 0, color: null },
      { url: "https://res.cloudinary.com/x/c.jpg", alt: "Hoka Clifton", position: 1, color: "Negro" },
    ])
  })

  it("si la acción del admin falla, la herramienta falla con su mensaje", async () => {
    vi.mocked(updateProduct).mockResolvedValue({ success: false, error: "La categoría es requerida." })
    await expect(byName("editar_producto")({ id: "p1", cambios: {} })).rejects.toThrow("La categoría es requerida.")
  })

  it("los banners nuevos nacen inactivos y activar_banner llega al estado pedido", async () => {
    vi.mocked(createBanner).mockResolvedValue({ success: true })
    vi.mocked(toggleBannerActive).mockResolvedValue({ success: true })
    await byName("guardar_banner")({ campos: { title: "Black Friday", imageUrl: "https://res.cloudinary.com/x/bf.jpg" } })
    expect(vi.mocked(createBanner).mock.calls[0][0].get("isActive")).toBe("false")
    await byName("activar_banner")({ id: "bn1", activo: true })
    // El servicio invierte el valor recibido: para activar se le pasa false.
    expect(toggleBannerActive).toHaveBeenCalledWith("bn1", false)
  })

  it("crear_seccion la deja inactiva y guardar borrador no publica", async () => {
    vi.mocked(createLandingSectionAction).mockResolvedValue({ success: true, newSection: { id: "sec1" } } as never)
    vi.mocked(toggleLandingSectionActiveAction).mockResolvedValue({ success: true })
    vi.mocked(updateLandingSectionConfigAction).mockResolvedValue({ success: true })
    await byName("crear_seccion")({ type: "HERO" })
    expect(createLandingSectionAction).toHaveBeenCalledWith("HERO", "home")
    expect(toggleLandingSectionActiveAction).toHaveBeenCalledWith("sec1", false)
    await byName("guardar_borrador_seccion")({ id: "sec1", config: { title: "Hola" } })
    expect(updateLandingSectionConfigAction).toHaveBeenCalledWith("sec1", { title: "Hola" })
    expect(publishLandingPageAction).not.toHaveBeenCalled()
  })

  it("subir_imagen solo acepta https con extensión de imagen o video y la sube a Cloudinary", async () => {
    const uploadImage = vi.fn(async () => ({ url: "https://res.cloudinary.com/x/up.jpg", publicId: "one-star/productos/up" }))
    vi.mocked(getStorageAdapter).mockReturnValue({ uploadImage } as never)
    const upload = byName("subir_imagen")
    await expect(upload({ url: "http://ejemplo.com/a.jpg" })).rejects.toThrow()
    await expect(upload({ url: "https://169.254.169.254/latest/meta-data" })).rejects.toThrow()
    await upload({ url: "https://ejemplo.com/fotos/tenis.webp" })
    expect(uploadImage).toHaveBeenCalledWith("https://ejemplo.com/fotos/tenis.webp", { folder: "one-star/productos" })
  })
})
