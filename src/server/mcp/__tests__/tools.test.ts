import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/server/auth/require-admin", () => ({ requireAdmin: vi.fn(async () => ({ user: { id: "adm_1" } })) }))
vi.mock("@/app/admin/productos/actions")
vi.mock("@/app/admin/marcas/actions")
vi.mock("@/app/admin/contenido/actions")
vi.mock("@/server/actions/category.actions")
vi.mock("@/server/actions/product-color.actions")
vi.mock("@/server/actions/banner.actions")
vi.mock("@/server/actions/top-banner.actions")
vi.mock("@/server/actions/media-asset.actions")
vi.mock("@/server/actions/store-settings.actions")
vi.mock("@/server/actions/navigation.actions")
vi.mock("@/server/actions/store.actions")
vi.mock("@/server/actions/landing.actions")
vi.mock("@/server/services/product.service")
vi.mock("@/server/services/category.service")
vi.mock("@/server/services/brand.service")
vi.mock("@/server/services/product-color.service")
vi.mock("@/server/services/store.service")
vi.mock("@/server/services/store-settings.service")
vi.mock("@/server/services/site-content.service")
vi.mock("@/server/services/navigation.service")
vi.mock("@/server/services/banner.service")
vi.mock("@/server/services/top-banner.service")
vi.mock("@/server/services/landing-section.service")
vi.mock("@/server/services/media-asset.service")
vi.mock("@/server/storage/storage.container")
vi.mock("@/server/validators/landing-section.validator", async () => {
  const { z } = await import("zod")
  return { LandingSectionTypeSchema: z.enum(["HERO", "CATEGORY_GRID"]), LandingPageSchema: z.string() }
})

import { MCP_TOOLS } from "../tools"
import { createBanner, toggleBannerActive } from "@/server/actions/banner.actions"
import { createLandingSectionAction, toggleLandingSectionActiveAction, updateLandingSectionConfigAction, publishLandingPageAction } from "@/server/actions/landing.actions"
import { updateStoreInfoAction } from "@/server/actions/store-settings.actions"
import { updateSiteContentAction, updateStorefrontLabelsAction } from "@/app/admin/contenido/actions"
import { createNavigationItemAction, updateNavigationPositionsAction } from "@/server/actions/navigation.actions"
import { updateStoreAction } from "@/server/actions/store.actions"
import { getStoreSettings } from "@/server/services/store-settings.service"
import { getSiteContentForAdmin, getStorefrontSettings } from "@/server/services/site-content.service"
import { getStoreLocations } from "@/server/services/store.service"
import { getStorageAdapter } from "@/server/storage/storage.container"

const byName = (name: string) => {
  const found = MCP_TOOLS.find((t) => t.name === name)
  if (!found) throw new Error(`falta ${name}`)
  return async (args: unknown) => found.run(found.input.parse(args) as never)
}

describe("herramientas MCP (solo Super Admin, sin edición de productos/stock)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("es una lista blanca solo Super Admin, sin datos de clientes ni edición de productos/stock", () => {
    const forbidden = /pedido|\border|cliente|customer|lead|pqrs|newsletter|usuario|cupon|regalo|borrar|eliminar|delete|editar_producto|publicar_productos/i
    for (const t of MCP_TOOLS) {
      expect(t.name).not.toMatch(forbidden)
      expect(t.area).toBe("superadmin")
    }
    expect(new Set(MCP_TOOLS.map((t) => t.name)).size).toBe(MCP_TOOLS.length)
    expect(MCP_TOOLS.find((t) => t.name === "buscar_productos")?.readOnly).toBe(true)
    expect(MCP_TOOLS.find((t) => t.name === "ver_producto")?.readOnly).toBe(true)
  })

  it("publicar y guardar borrador son pasos separados", () => {
    const tool = (name: string) => MCP_TOOLS.find((t) => t.name === name)!
    expect(tool("guardar_borrador_seccion")).toMatchObject({ live: false, area: "superadmin" })
    expect(tool("publicar_pagina")).toMatchObject({ live: true, area: "superadmin" })
    expect(tool("ver_pagina").area).toBe("superadmin")
  })

  it("los banners nuevos nacen inactivos y activar_banner llega al estado pedido", async () => {
    vi.mocked(createBanner).mockResolvedValue({ success: true })
    vi.mocked(toggleBannerActive).mockResolvedValue({ success: true })
    await byName("guardar_banner")({ campos: { title: "Black Friday", imageUrl: "https://res.cloudinary.com/x/bf.jpg" } })
    expect(vi.mocked(createBanner).mock.calls[0][0].get("isActive")).toBe("false")
    await byName("activar_banner")({ id: "bn1", activo: true })
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

  it("ver_configuracion oculta secretos/píxel y editar_configuracion conserva campos no enviados", async () => {
    vi.mocked(getStoreSettings).mockResolvedValue({
      storeName: "One Star",
      contactEmail: "hola@onestar.com",
      whatsapp: "+573137620554",
      metaPixelId: "123",
      metaPixelEnabled: true,
      metaTestEventCode: "TEST",
      hasMetaAccessToken: true,
      metaAccessTokenHint: "9876",
      catalogSource: "ARCHIVO",
      freeShippingThreshold: 299900,
      standardShippingCost: 14900,
      expressShippingCost: 25000,
      legalName: "One Star SAS",
      taxId: "900",
      legalAddress: "Cra 1",
      contactPhone: "313",
      hideImagelessProducts: true,
      hideEmptySale: false,
      newArrivalDays: 30,
      chatEnabled: true,
      chatWelcome: "Hola",
      giftCardMinAmount: 50000,
      giftCardMaxAmount: 500000,
      giftCardValidityMonths: 12,
      clubHeadline: "Club",
      clubIntro: "Intro",
      clubBenefits: "",
      clubWelcomeSubject: "",
      clubWelcomeBody: "",
      footerLinks: "",
      bottomNav: "",
      deliveryMinDays: 3,
      deliveryMaxDays: 5,
      expressDeliveryMinDays: 1,
      expressDeliveryMaxDays: 2,
      pickupReadyMinDays: 1,
      pickupReadyMaxDays: 2,
      legalCity: "Manizales",
      commercialRegistry: null,
      dataProtectionEmail: null,
      termsDocumentUrl: null,
      privacyDocumentUrl: null,
      returnsDocumentUrl: null,
      giftCardAmounts: "100000,200000",
      groupColorsInCatalog: true,
    })
    vi.mocked(updateStoreInfoAction).mockResolvedValue({ success: true })

    const view = (await byName("ver_configuracion")({})) as Record<string, unknown>
    expect(view.storeName).toBe("One Star")
    expect(view).not.toHaveProperty("metaAccessTokenHint")
    expect(view).not.toHaveProperty("hasMetaAccessToken")

    await byName("editar_configuracion")({ cambios: { standardShippingCost: 15900 } })
    const fd = vi.mocked(updateStoreInfoAction).mock.calls[0][0]
    expect(fd.get("standardShippingCost")).toBe("15900")
    expect(fd.get("freeShippingThreshold")).toBe("299900")
    expect(fd.get("whatsapp")).toBe("+573137620554")
    expect(fd.get("chatEnabled")).toBe("on")
  })

  it("editar_contenido_global, guardar_menu y guardar_tienda delegan a las acciones de Super Admin", async () => {
    vi.mocked(getSiteContentForAdmin).mockResolvedValue({
      id: "default",
      highlights: ["Envío rápido"],
      faqs: [{ q: "¿Cambios?", a: "30 días" }],
      promises: [],
      returnWindowDays: 30,
    })
    vi.mocked(getStorefrontSettings).mockResolvedValue({
      addToCartLabel: "Agregar",
      buyNowLabel: "Comprar",
      storeStockText: "Disponible",
      autoPublishReviews: false,
    })
    vi.mocked(updateSiteContentAction).mockResolvedValue({ success: true })
    vi.mocked(updateStorefrontLabelsAction).mockResolvedValue({ success: true })
    await byName("editar_contenido_global")({ returnWindowDays: 15, addToCartLabel: "Añadir al carrito" })
    expect(updateSiteContentAction).toHaveBeenCalled()
    expect(updateStorefrontLabelsAction).toHaveBeenCalled()

    vi.mocked(createNavigationItemAction).mockResolvedValue({ success: true } as never)
    vi.mocked(updateNavigationPositionsAction).mockResolvedValue({ success: true })
    await byName("guardar_menu")({ label: "Black Week", href: "/productos?oferta=1", isSale: true })
    expect(createNavigationItemAction).toHaveBeenCalledWith("Black Week", "/productos?oferta=1", true)
    await byName("guardar_menu")({ orden: [{ id: "n1", position: 0 }] })
    expect(updateNavigationPositionsAction).toHaveBeenCalledWith([{ id: "n1", position: 0 }])

    vi.mocked(getStoreLocations).mockResolvedValue([
      { id: "st1", name: "Centro", address: "Cra 23", city: "Manizales", department: "Caldas", phone: "111", schedule: "9-7", googleMapsUrl: null, latitude: null, longitude: null, isActive: true, photos: [], erpId: "erp-1" } as never,
    ])
    vi.mocked(updateStoreAction).mockResolvedValue({ success: true })
    await byName("guardar_tienda")({ id: "st1", campos: { schedule: "L-S 9am a 8pm" } })
    expect(updateStoreAction).toHaveBeenCalledWith(
      "st1",
      expect.objectContaining({ name: "Centro", schedule: "L-S 9am a 8pm", erpId: "erp-1" })
    )
  })
})
