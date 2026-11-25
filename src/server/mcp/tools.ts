import "server-only"

import { z } from "zod"
import type { LandingSectionType, Prisma } from "@prisma/client"
import { requireAdmin } from "@/server/auth/require-admin"
import { faqsToText, parseProductFaqs } from "@/lib/product-faq"
import { searchProducts } from "@/app/admin/productos/actions"
import { createBrandAction, updateBrandAction } from "@/app/admin/marcas/actions"
import { updateSiteContentAction, updateStorefrontLabelsAction } from "@/app/admin/contenido/actions"
import { createCategoryAction, updateCategoryAction } from "@/server/actions/category.actions"
import { createColorAction, updateColorAction } from "@/server/actions/product-color.actions"
import { createBanner, toggleBannerActive, updateBanner } from "@/server/actions/banner.actions"
import { updateTopBannerAction } from "@/server/actions/top-banner.actions"
import { getMediaAssetsAction } from "@/server/actions/media-asset.actions"
import { updateStoreInfoAction } from "@/server/actions/store-settings.actions"
import {
  createNavigationItemAction,
  toggleNavigationItemActiveAction,
  updateNavigationItemAction,
  updateNavigationPositionsAction,
} from "@/server/actions/navigation.actions"
import {
  createStoreAction,
  toggleStoreActiveAction,
  updateStoreAction,
} from "@/server/actions/store.actions"
import {
  createLandingSectionAction,
  publishLandingPageAction,
  toggleLandingSectionActiveAction,
  updateLandingSectionConfigAction,
  updateLandingSectionPositionsAction,
} from "@/server/actions/landing.actions"
import { getProductByIdForAdmin } from "@/server/services/product.service"
import { getCategories } from "@/server/services/category.service"
import { getAllBrands, getBrandDetailById, type BrandDetailDTO } from "@/server/services/brand.service"
import { getProductColorsForAdmin } from "@/server/services/product-color.service"
import { getStoreLocations } from "@/server/services/store.service"
import { getStoreSettings, type StoreSettingsDTO } from "@/server/services/store-settings.service"
import { getSiteContentForAdmin, getStorefrontSettings } from "@/server/services/site-content.service"
import { getAllNavigationItems } from "@/server/services/navigation.service"
import { getAllBanners } from "@/server/services/banner.service"
import { getTopBanner } from "@/server/services/top-banner.service"
import { getAllLandingSections, getLandingPages } from "@/server/services/landing-section.service"
import { getStorageAdapter } from "@/server/storage/storage.container"
import { createMediaAsset } from "@/server/services/media-asset.service"
import { LandingSectionTypeSchema } from "@/server/validators/landing-section.validator"

/**
 * Herramientas del conector MCP (exclusivo para Super Admin).
 * LISTA BLANCA:
 * - Productos y stock son SOLO LECTURA (no modifica productos, precios ni inventario).
 * - Nada de pedidos, clientes, leads, PQRS, newsletter, usuarios, cupones ni secretos/credenciales.
 * - Cada herramienta llama a la misma acción o servicio del admin, que vuelve a exigir requireAdmin("superadmin").
 */
export interface McpTool {
  name: string
  description: string
  /** Área mínima para ver y usar la herramienta (solo superadmin). */
  area: "superadmin"
  /** true = solo lee. */
  readOnly: boolean
  /** true = cambia lo que ven los clientes en la tienda (Claude pide confirmación). */
  live: boolean
  input: z.ZodObject
  run(args: never): Promise<unknown>
}

function tool<S extends z.ZodObject>(def: Omit<McpTool, "input" | "run"> & {
  input: S
  run(args: z.infer<S>): Promise<unknown>
}): McpTool {
  return def as McpTool
}

/** Las acciones del admin devuelven { success, error }: un fallo se vuelve error de la herramienta. */
function ok<T extends { success: boolean; error?: string }>(result: T): T {
  if (!result.success) throw new Error(result.error || "La acción no se pudo completar.")
  return result
}

function toFormData(values: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(values)) fd.set(key, value)
  return fd
}

const id = z.string().trim().min(1).max(64)
const page = z.string().trim().min(1).max(60).default("home").describe('"home" = Inicio; otro slug = /<slug>')
const mediaExtension = /\.(jpe?g|png|webp|gif|avif|mp4|mov|webm)$/i

// ---------------------------------------------------------------- marcas

const brandFieldsSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().max(120).optional(),
  logoUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  sizeGuideImageUrl: z.string().url().nullable().optional(),
  sizeGuideMenUrl: z.string().url().nullable().optional(),
  sizeGuideWomenUrl: z.string().url().nullable().optional(),
  sizeGuideKidsUrl: z.string().url().nullable().optional(),
  sizeGuideNote: z.string().max(2000).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  story: z.string().max(20000).nullable().optional(),
  metaTitle: z.string().max(200).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  highlights: z.array(z.string().max(200)).max(8).optional(),
  faqs: z.array(z.object({ q: z.string().max(300), a: z.string().max(1500) })).max(12).optional(),
  isActive: z.boolean().optional(),
})

/** Mismo FormData que el formulario de marcas: lo no enviado conserva su valor actual. */
function brandFormData(current: Partial<BrandDetailDTO>, changes: z.infer<typeof brandFieldsSchema>): FormData {
  const m = { ...current, ...changes }
  const text = (value: string | null | undefined) => value ?? ""
  return toFormData({
    name: text(m.name),
    slug: text(m.slug),
    logoUrl: text(m.logoUrl),
    bannerUrl: text(m.bannerUrl),
    sizeGuideImageUrl: text(m.sizeGuideImageUrl),
    sizeGuideMenUrl: text(m.sizeGuideMenUrl),
    sizeGuideWomenUrl: text(m.sizeGuideWomenUrl),
    sizeGuideKidsUrl: text(m.sizeGuideKidsUrl),
    sizeGuideNote: text(m.sizeGuideNote),
    description: text(m.description),
    story: text(m.story),
    metaTitle: text(m.metaTitle),
    metaDescription: text(m.metaDescription),
    highlights: (m.highlights ?? []).join("\n"),
    faqs: faqsToText(m.faqs ?? []),
    isActive: String(m.isActive ?? true),
  })
}

// ---------------------------------------------------------------- banners

const bannerFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  imageUrl: z.string().url(),
  mediaType: z.enum(["image", "video"]).default("image"),
  linkUrl: z.string().max(500).nullable().optional(),
  position: z.number().int().nonnegative().default(0),
  startDate: z.string().nullable().optional().describe("ISO, ej. 2026-11-20"),
  endDate: z.string().nullable().optional(),
})

function bannerFormData(fields: z.infer<typeof bannerFieldsSchema>, isActive: boolean): FormData {
  return toFormData({
    title: fields.title,
    imageUrl: fields.imageUrl,
    mediaType: fields.mediaType,
    linkUrl: fields.linkUrl ?? "",
    position: String(fields.position),
    isActive: String(isActive),
    startDate: fields.startDate ?? "",
    endDate: fields.endDate ?? "",
  })
}

// ---------------------------------------------------------------- configuración de tienda

const storeSettingsChangesSchema = z.object({
  storeName: z.string().trim().min(1).max(120).optional(),
  contactEmail: z.string().trim().max(160).nullable().optional(),
  whatsapp: z.string().trim().max(40).nullable().optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  freeShippingThreshold: z.number().nonnegative().optional(),
  standardShippingCost: z.number().nonnegative().optional(),
  expressShippingCost: z.number().nonnegative().optional(),
  deliveryMinDays: z.number().int().positive().max(30).optional(),
  deliveryMaxDays: z.number().int().positive().max(60).optional(),
  expressDeliveryMinDays: z.number().int().positive().max(15).optional(),
  expressDeliveryMaxDays: z.number().int().positive().max(30).optional(),
  pickupReadyMinDays: z.number().int().nonnegative().max(15).nullable().optional(),
  pickupReadyMaxDays: z.number().int().nonnegative().max(30).nullable().optional(),
  legalName: z.string().trim().max(160).nullable().optional(),
  taxId: z.string().trim().max(60).nullable().optional(),
  legalAddress: z.string().trim().max(240).nullable().optional(),
  legalCity: z.string().trim().max(120).nullable().optional(),
  commercialRegistry: z.string().trim().max(120).nullable().optional(),
  dataProtectionEmail: z.string().trim().max(160).nullable().optional(),
  hideImagelessProducts: z.boolean().optional(),
  hideEmptySale: z.boolean().optional(),
  groupColorsInCatalog: z.boolean().optional(),
  newArrivalDays: z.number().int().nonnegative().max(365).optional(),
  chatEnabled: z.boolean().optional(),
  chatWelcome: z.string().max(600).optional(),
  clubHeadline: z.string().max(200).optional(),
  clubIntro: z.string().max(1000).optional(),
  clubBenefits: z.string().max(3000).optional(),
  clubWelcomeSubject: z.string().max(200).optional(),
  clubWelcomeBody: z.string().max(4000).optional(),
  footerLinks: z.string().max(4000).optional(),
  bottomNav: z.string().max(2000).optional(),
})

function safeStoreSettingsView(s: StoreSettingsDTO) {
  return {
    storeName: s.storeName,
    contactEmail: s.contactEmail,
    whatsapp: s.whatsapp,
    contactPhone: s.contactPhone,
    freeShippingThreshold: s.freeShippingThreshold,
    standardShippingCost: s.standardShippingCost,
    expressShippingCost: s.expressShippingCost,
    deliveryMinDays: s.deliveryMinDays,
    deliveryMaxDays: s.deliveryMaxDays,
    expressDeliveryMinDays: s.expressDeliveryMinDays,
    expressDeliveryMaxDays: s.expressDeliveryMaxDays,
    pickupReadyMinDays: s.pickupReadyMinDays,
    pickupReadyMaxDays: s.pickupReadyMaxDays,
    legalName: s.legalName,
    taxId: s.taxId,
    legalAddress: s.legalAddress,
    legalCity: s.legalCity,
    commercialRegistry: s.commercialRegistry,
    dataProtectionEmail: s.dataProtectionEmail,
    hideImagelessProducts: s.hideImagelessProducts,
    hideEmptySale: s.hideEmptySale,
    groupColorsInCatalog: s.groupColorsInCatalog,
    newArrivalDays: s.newArrivalDays,
    chatEnabled: s.chatEnabled,
    chatWelcome: s.chatWelcome,
    clubHeadline: s.clubHeadline,
    clubIntro: s.clubIntro,
    clubBenefits: s.clubBenefits,
    clubWelcomeSubject: s.clubWelcomeSubject,
    clubWelcomeBody: s.clubWelcomeBody,
    footerLinks: s.footerLinks,
    bottomNav: s.bottomNav,
  }
}

function storeSettingsFormData(
  current: StoreSettingsDTO,
  changes: z.infer<typeof storeSettingsChangesSchema>
): FormData {
  const m = { ...current, ...changes }
  const str = (v: string | number | null | undefined) => (v == null ? "" : String(v))
  const fd = toFormData({
    storeName: m.storeName,
    contactEmail: str(m.contactEmail),
    whatsapp: str(m.whatsapp),
    contactPhone: str(m.contactPhone),
    freeShippingThreshold: str(m.freeShippingThreshold),
    standardShippingCost: str(m.standardShippingCost),
    expressShippingCost: str(m.expressShippingCost),
    legalName: str(m.legalName),
    taxId: str(m.taxId),
    legalAddress: str(m.legalAddress),
    newArrivalDays: str(m.newArrivalDays),
    chatWelcome: str(m.chatWelcome),
    giftCardMinAmount: str(current.giftCardMinAmount),
    giftCardMaxAmount: str(current.giftCardMaxAmount),
    giftCardValidityMonths: str(current.giftCardValidityMonths),
    giftCardAmounts: str(current.giftCardAmounts),
    clubHeadline: str(m.clubHeadline),
    clubIntro: str(m.clubIntro),
    clubBenefits: str(m.clubBenefits),
    clubWelcomeSubject: str(m.clubWelcomeSubject),
    clubWelcomeBody: str(m.clubWelcomeBody),
    footerLinks: str(m.footerLinks),
    bottomNav: str(m.bottomNav),
    deliveryMinDays: str(m.deliveryMinDays),
    deliveryMaxDays: str(m.deliveryMaxDays),
    expressDeliveryMinDays: str(m.expressDeliveryMinDays),
    expressDeliveryMaxDays: str(m.expressDeliveryMaxDays),
    pickupReadyMinDays: str(m.pickupReadyMinDays),
    pickupReadyMaxDays: str(m.pickupReadyMaxDays),
    legalCity: str(m.legalCity),
    commercialRegistry: str(m.commercialRegistry),
    dataProtectionEmail: str(m.dataProtectionEmail),
  })
  if (m.hideImagelessProducts) fd.set("hideImagelessProducts", "on")
  if (m.hideEmptySale) fd.set("hideEmptySale", "on")
  if (m.groupColorsInCatalog) fd.set("groupColorsInCatalog", "on")
  if (m.chatEnabled) fd.set("chatEnabled", "on")
  return fd
}

// ---------------------------------------------------------------- tiendas físicas

const storeFieldsSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  address: z.string().trim().min(1).max(200).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  department: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  schedule: z.string().trim().max(200).nullable().optional(),
  googleMapsUrl: z.string().trim().max(500).nullable().optional(),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  isActive: z.boolean().optional(),
  photos: z.array(z.string().trim().min(1)).max(12).optional(),
})

// ---------------------------------------------------------------- lista blanca

export const MCP_TOOLS: McpTool[] = [
  // ---- Lectura de catálogo (SOLO LECTURA: sin editar productos ni stock)
  tool({
    name: "buscar_productos",
    description: "Solo lectura: busca productos del catálogo por nombre para obtener id, slug, marca e imagen.",
    area: "superadmin",
    readOnly: true,
    live: false,
    input: z.object({ q: z.string().trim().min(1).max(100) }),
    run: async ({ q }) => {
      await requireAdmin("superadmin")
      return searchProducts(q)
    },
  }),
  tool({
    name: "ver_producto",
    description: "Solo lectura: consulta textos, precios, fotos y variantes de un producto (no permite modificar productos ni stock).",
    area: "superadmin",
    readOnly: true,
    live: false,
    input: z.object({ id }),
    run: async ({ id: productId }) => {
      await requireAdmin("superadmin")
      const p = await getProductByIdForAdmin(productId)
      if (!p) throw new Error("Producto no encontrado.")
      return {
        id: p.id, name: p.name, slug: p.slug, isPublished: p.isPublished,
        categoryId: p.categoryId, brandId: p.brandId, gender: p.gender,
        description: p.description, extendedDescription: p.extendedDescription, videoUrl: p.videoUrl,
        basePrice: p.basePrice, isOnSale: p.isOnSale, salePrice: p.salePrice,
        metaTitle: p.metaTitle, metaDescription: p.metaDescription,
        highlights: p.highlights, faqs: parseProductFaqs(p.faqs),
        images: p.images.map((img) => ({ url: img.url, alt: img.alt, color: img.color })),
        variants: p.variants.map((v) => ({ sku: v.sku, size: v.size, color: v.color, stock: v.stock })),
      }
    },
  }),
  tool({
    name: "listar_catalogo",
    description: "Solo lectura: categorías, marcas y colores con sus id.",
    area: "superadmin",
    readOnly: true,
    live: false,
    input: z.object({}),
    run: async () => {
      await requireAdmin("superadmin")
      const [categorias, marcas, colores] = await Promise.all([getCategories(), getAllBrands(), getProductColorsForAdmin()])
      return { categorias, marcas, colores }
    },
  }),

  // ---- Taxonomía y archivos (sin tocar productos ni inventario)
  tool({
    name: "guardar_categoria",
    description: "Crea una categoría (sin id) o renombra una existente (con id).",
    area: "superadmin",
    readOnly: false,
    live: true,
    input: z.object({ id: id.optional(), name: z.string().trim().min(1).max(120), slug: z.string().trim().min(1).max(120) }),
    run: async ({ id: categoryId, name, slug }) => {
      await requireAdmin("superadmin")
      return ok(categoryId ? await updateCategoryAction(categoryId, name, slug) : await createCategoryAction(name, slug))
    },
  }),
  tool({
    name: "guardar_marca",
    description: "Crea una marca (sin id) o cambia textos/guías/imágenes de una existente (con id; lo no enviado se conserva).",
    area: "superadmin",
    readOnly: false,
    live: true,
    input: z.object({ id: id.optional(), campos: brandFieldsSchema }),
    run: async ({ id: brandId, campos }) => {
      await requireAdmin("superadmin")
      if (!brandId) return ok(await createBrandAction(brandFormData({}, campos)))
      const current = await getBrandDetailById(brandId)
      if (!current) throw new Error("Marca no encontrada.")
      return ok(await updateBrandAction(brandId, brandFormData(current, campos)))
    },
  }),
  tool({
    name: "guardar_color",
    description: "Crea un color (sin id) o edita uno existente (con id).",
    area: "superadmin",
    readOnly: false,
    live: true,
    input: z.object({
      id: id.optional(),
      name: z.string().trim().min(1).max(40),
      hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      isActive: z.boolean().default(true),
    }),
    run: async ({ id: colorId, name, hex, isActive }) => {
      await requireAdmin("superadmin")
      const fd = toFormData({ name, hex, isActive: String(isActive) })
      return ok(colorId ? await updateColorAction(colorId, fd) : await createColorAction(fd))
    },
  }),
  tool({
    name: "subir_imagen",
    description:
      "Sube a Cloudinary (carpeta one-star/productos) una imagen o video desde una URL https pública y la registra en Archivos. Para fotos del computador usa POST /api/mcp/upload.",
    area: "superadmin",
    readOnly: false,
    live: false,
    input: z.object({
      url: z
        .string()
        .url()
        .refine((value) => value.startsWith("https://"), "La URL debe ser https.")
        .refine((value) => mediaExtension.test(new URL(value).pathname), "La URL debe terminar en .jpg, .png, .webp, .gif, .avif, .mp4, .mov o .webm."),
      nombre: z.string().trim().max(120).optional(),
    }),
    run: async ({ url, nombre }) => {
      await requireAdmin("superadmin")
      const result = await getStorageAdapter().uploadImage(url, { folder: "one-star/productos" })
      const fileType = /\.(mp4|mov|webm)$/i.test(new URL(url).pathname) ? "video" : "image"
      await createMediaAsset({
        url: result.url,
        publicId: result.publicId,
        fileName: nombre || new URL(url).pathname.split("/").pop() || "archivo",
        fileType,
        folder: "productos",
      })
      return result
    },
  }),
  tool({
    name: "listar_archivos",
    description: "Imágenes y videos ya subidos a la biblioteca (Archivos), con su URL.",
    area: "superadmin",
    readOnly: true,
    live: false,
    input: z.object({
      tipo: z.enum(["image", "video"]).optional(),
      buscar: z.string().max(100).optional(),
      limite: z.number().int().min(1).max(100).default(30),
    }),
    run: async ({ tipo, buscar, limite }) => {
      await requireAdmin("superadmin")
      return ok(await getMediaAssetsAction({ fileType: tipo, search: buscar, limit: limite })).data
    },
  }),

  // ---- Constructor de páginas (Inicio y campañas)
  tool({
    name: "ver_pagina",
    description:
      "Secciones del constructor de una página (Inicio u otra campaña) con lo publicado (config) y el borrador pendiente (draftConfig).",
    area: "superadmin",
    readOnly: true,
    live: false,
    input: z.object({ page }),
    run: async ({ page: slug }) => {
      await requireAdmin("superadmin")
      const [sections, pages] = await Promise.all([getAllLandingSections(slug), getLandingPages()])
      return {
        paginas: pages,
        secciones: sections.map((s) => ({
          id: s.id, type: s.type, position: s.position, isActive: s.isActive,
          tieneBorrador: s.draftConfig != null, config: s.config, draftConfig: s.draftConfig,
        })),
      }
    },
  }),
  tool({
    name: "guardar_borrador_seccion",
    description:
      "Guarda la configuración COMPLETA de una sección como borrador. NO publica hasta usar publicar_pagina.",
    area: "superadmin",
    readOnly: false,
    live: false,
    input: z.object({ id, config: z.record(z.string(), z.unknown()) }),
    run: async ({ id: sectionId, config }) =>
      ok(await updateLandingSectionConfigAction(sectionId, config as Prisma.InputJsonValue)),
  }),
  tool({
    name: "crear_seccion",
    description: "Crea una sección nueva al final de la página, INACTIVA y con contenido de ejemplo.",
    area: "superadmin",
    readOnly: false,
    live: false,
    input: z.object({ type: LandingSectionTypeSchema, page }),
    run: async ({ type, page: slug }) => {
      const created = ok(await createLandingSectionAction(type as LandingSectionType, slug))
      const sectionId = created.newSection!.id
      ok(await toggleLandingSectionActiveAction(sectionId, false))
      return { id: sectionId, type, page: slug, isActive: false }
    },
  }),
  tool({
    name: "publicar_pagina",
    description: "PUBLICA en la tienda todos los borradores pendientes de la página. Confirma con el usuario antes de usarla.",
    area: "superadmin",
    readOnly: false,
    live: true,
    input: z.object({ page }),
    run: async ({ page: slug }) => ok(await publishLandingPageAction(slug)),
  }),
  tool({
    name: "activar_seccion",
    description: "Muestra (activa: true) u oculta una sección en la tienda. Sale en vivo al instante.",
    area: "superadmin",
    readOnly: false,
    live: true,
    input: z.object({ id, activa: z.boolean() }),
    run: async ({ id: sectionId, activa }) => ok(await toggleLandingSectionActiveAction(sectionId, activa)),
  }),
  tool({
    name: "ordenar_secciones",
    description: "Cambia el orden de las secciones (posiciones únicas). Sale en vivo al instante.",
    area: "superadmin",
    readOnly: false,
    live: true,
    input: z.object({ orden: z.array(z.object({ id, position: z.number().int().nonnegative() })).min(1).max(100) }),
    run: async ({ orden }) => ok(await updateLandingSectionPositionsAction(orden)),
  }),

  // ---- Banners y barra superior
  tool({
    name: "listar_banners",
    description: "Banners del carrusel y la barra superior de mensajes.",
    area: "superadmin",
    readOnly: true,
    live: false,
    input: z.object({}),
    run: async () => {
      await requireAdmin("superadmin")
      const [banners, barraSuperior] = await Promise.all([getAllBanners(), getTopBanner()])
      return { banners, barraSuperior }
    },
  }),
  tool({
    name: "guardar_banner",
    description: "Crea un banner (sin id; nace INACTIVO) o edita uno (con id; si está activo, el cambio sale en vivo).",
    area: "superadmin",
    readOnly: false,
    live: true,
    input: z.object({ id: id.optional(), campos: bannerFieldsSchema }),
    run: async ({ id: bannerId, campos }) => {
      await requireAdmin("superadmin")
      if (!bannerId) return ok(await createBanner(bannerFormData(campos, false)))
      const current = (await getAllBanners()).find((banner) => banner.id === bannerId)
      if (!current) throw new Error("Banner no encontrado.")
      return ok(await updateBanner(bannerId, bannerFormData(campos, current.isActive)))
    },
  }),
  tool({
    name: "activar_banner",
    description: "Muestra (activo: true) u oculta un banner en la tienda. Sale en vivo al instante.",
    area: "superadmin",
    readOnly: false,
    live: true,
    input: z.object({ id, activo: z.boolean() }),
    run: async ({ id: bannerId, activo }) => ok(await toggleBannerActive(bannerId, !activo)),
  }),
  tool({
    name: "editar_barra_superior",
    description: "Cambia la barra de mensajes de arriba de la tienda (lo no enviado se conserva). Sale en vivo al instante.",
    area: "superadmin",
    readOnly: false,
    live: true,
    input: z.object({
      messages: z.array(z.object({ text: z.string().max(200), url: z.string().max(500).optional() })).max(20).optional(),
      btnText: z.string().max(80).nullable().optional(),
      btnUrl: z.string().max(500).nullable().optional(),
      bgColor: z.string().max(32).optional(),
      textColor: z.string().max(32).optional(),
      tickerSeconds: z.number().int().min(3).max(30).optional().describe("Segundos que tarda cada mensaje en cruzar (más alto = más lento). Por defecto 6."),
      isActive: z.boolean().optional(),
    }),
    run: async (changes) => {
      await requireAdmin("superadmin")
      const current = await getTopBanner()
      const messages = changes.messages ?? (Array.isArray(current?.messages) ? (current.messages as { text: string; url?: string }[]) : [])
      return ok(
        await updateTopBannerAction({
          text: messages[0]?.text ?? current?.text ?? "",
          btnText: changes.btnText !== undefined ? changes.btnText : current?.btnText ?? null,
          btnUrl: changes.btnUrl !== undefined ? changes.btnUrl : current?.btnUrl ?? null,
          messages,
          bgColor: changes.bgColor ?? current?.bgColor ?? "#1C1C1C",
          textColor: changes.textColor ?? current?.textColor ?? "#FFFFFF",
          tickerSeconds: changes.tickerSeconds ?? current?.tickerSeconds ?? 6,
          isActive: changes.isActive ?? current?.isActive ?? false,
        })
      )
    },
  }),

  // ---- Configuración general de la tienda (sin secretos ni integraciones)
  tool({
    name: "ver_configuracion",
    description: "Lee la configuración pública y operativa de la tienda: envíos, tiempos de entrega, WhatsApp, contacto, chat, One Star Club, enlaces de pie de página y barra móvil (sin secretos).",
    area: "superadmin",
    readOnly: true,
    live: false,
    input: z.object({}),
    run: async () => {
      await requireAdmin("superadmin")
      return safeStoreSettingsView(await getStoreSettings())
    },
  }),
  tool({
    name: "editar_configuracion",
    description: "Modifica campos de la configuración general de la tienda (solo los enviados; el resto se conserva). No toca tokens ni integraciones. Sale en vivo al instante.",
    area: "superadmin",
    readOnly: false,
    live: true,
    input: z.object({ cambios: storeSettingsChangesSchema }),
    run: async ({ cambios }) => {
      await requireAdmin("superadmin")
      const current = await getStoreSettings()
      return ok(await updateStoreInfoAction(storeSettingsFormData(current, cambios)))
    },
  }),

  // ---- Contenido global de ficha y políticas (/admin/contenido)
  tool({
    name: "ver_contenido_global",
    description: "Lee el contenido global compartido de la tienda: destacados, preguntas frecuentes, promesas, días de cambio y textos de botones de ficha.",
    area: "superadmin",
    readOnly: true,
    live: false,
    input: z.object({}),
    run: async () => {
      await requireAdmin("superadmin")
      const [contenido, textosFicha] = await Promise.all([getSiteContentForAdmin(), getStorefrontSettings()])
      return { contenido, textosFicha }
    },
  }),
  tool({
    name: "editar_contenido_global",
    description: "Actualiza destacados, preguntas frecuentes, promesas, días de cambio o textos de botones de ficha (lo no enviado se conserva). Sale en vivo al instante.",
    area: "superadmin",
    readOnly: false,
    live: true,
    input: z.object({
      highlights: z.array(z.string().max(200)).max(8).optional(),
      faqs: z.array(z.object({ q: z.string().max(300), a: z.string().max(1500) })).max(12).optional(),
      returnWindowDays: z.number().int().min(1).max(365).optional(),
      returnsTitle: z.string().max(120).optional(),
      returnsText: z.string().max(500).optional(),
      paymentTitle: z.string().max(120).optional(),
      paymentText: z.string().max(500).optional(),
      supportTitle: z.string().max(120).optional(),
      supportText: z.string().max(500).optional(),
      addToCartLabel: z.string().max(60).optional(),
      buyNowLabel: z.string().max(60).optional(),
      storeStockText: z.string().max(160).optional(),
    }),
    run: async (changes) => {
      await requireAdmin("superadmin")
      const hasContentChange =
        changes.highlights !== undefined ||
        changes.faqs !== undefined ||
        changes.returnWindowDays !== undefined ||
        changes.returnsTitle !== undefined ||
        changes.returnsText !== undefined ||
        changes.paymentTitle !== undefined ||
        changes.paymentText !== undefined ||
        changes.supportTitle !== undefined ||
        changes.supportText !== undefined

      if (hasContentChange) {
        const current = await getSiteContentForAdmin()
        const byId = (pid: string) => current.promises?.find((p) => p.id === pid)
        const fd = toFormData({
          highlights: (changes.highlights ?? current.highlights).join("\n"),
          faqs: faqsToText(changes.faqs ?? current.faqs),
          returnWindowDays: String(changes.returnWindowDays ?? current.returnWindowDays),
          returnsTitle: changes.returnsTitle ?? byId("returns")?.title ?? "",
          returnsText: changes.returnsText ?? byId("returns")?.text ?? "",
          paymentTitle: changes.paymentTitle ?? byId("payment")?.title ?? "",
          paymentText: changes.paymentText ?? byId("payment")?.text ?? "",
          supportTitle: changes.supportTitle ?? byId("support")?.title ?? "",
          supportText: changes.supportText ?? byId("support")?.text ?? "",
        })
        ok(await updateSiteContentAction(fd))
      }

      if (
        changes.addToCartLabel !== undefined ||
        changes.buyNowLabel !== undefined ||
        changes.storeStockText !== undefined
      ) {
        const labels = await getStorefrontSettings()
        const fd = toFormData({
          addToCartLabel: changes.addToCartLabel ?? labels.addToCartLabel,
          buyNowLabel: changes.buyNowLabel ?? labels.buyNowLabel,
          storeStockText: changes.storeStockText ?? labels.storeStockText,
        })
        ok(await updateStorefrontLabelsAction(fd))
      }

      return { success: true }
    },
  }),

  // ---- Menú de navegación superior
  tool({
    name: "listar_menu",
    description: "Lista los enlaces del menú superior de navegación con su orden y estado.",
    area: "superadmin",
    readOnly: true,
    live: false,
    input: z.object({}),
    run: async () => {
      await requireAdmin("superadmin")
      return getAllNavigationItems()
    },
  }),
  tool({
    name: "guardar_menu",
    description: "Crea un enlace de menú (sin id), edita uno existente (con id), cambia su estado activo o reordena posiciones (con orden). Sale en vivo al instante.",
    area: "superadmin",
    readOnly: false,
    live: true,
    input: z.object({
      id: id.optional(),
      label: z.string().trim().min(1).max(60).optional(),
      href: z.string().trim().min(1).max(300).optional(),
      isSale: z.boolean().optional(),
      isActive: z.boolean().optional(),
      orden: z.array(z.object({ id, position: z.number().int().nonnegative() })).min(1).max(50).optional(),
    }),
    run: async ({ id: itemId, label, href, isSale, isActive, orden }) => {
      await requireAdmin("superadmin")
      if (orden) return ok(await updateNavigationPositionsAction(orden))
      if (!itemId) {
        if (!label || !href) throw new Error("Para crear un enlace indica label y href.")
        return ok(await createNavigationItemAction(label, href, isSale ?? false))
      }
      if (label !== undefined || href !== undefined || isSale !== undefined) {
        const current = (await getAllNavigationItems()).find((item) => item.id === itemId)
        if (!current) throw new Error("Enlace de menú no encontrado.")
        ok(
          await updateNavigationItemAction(
            itemId,
            label ?? current.label,
            href ?? current.href,
            isSale ?? current.isSale
          )
        )
      }
      if (isActive !== undefined) {
        ok(await toggleNavigationItemActiveAction(itemId, isActive))
      }
      return { success: true }
    },
  }),

  // ---- Tiendas físicas (horarios, direcciones, teléfonos)
  tool({
    name: "listar_tiendas",
    description: "Lista todas las tiendas físicas (dirección, ciudad, teléfono, horario, estado).",
    area: "superadmin",
    readOnly: true,
    live: false,
    input: z.object({}),
    run: async () => {
      await requireAdmin("superadmin")
      return getStoreLocations()
    },
  }),
  tool({
    name: "guardar_tienda",
    description: "Crea una tienda física (sin id) o actualiza campos de una existente (con id; lo no enviado se conserva, sin tocar vínculo ERP). Sale en vivo al instante.",
    area: "superadmin",
    readOnly: false,
    live: true,
    input: z.object({
      id: id.optional(),
      campos: storeFieldsSchema,
    }),
    run: async ({ id: storeId, campos }) => {
      await requireAdmin("superadmin")
      if (!storeId) {
        if (!campos.name || !campos.address || !campos.city) {
          throw new Error("Para crear una tienda indica name, address y city.")
        }
        return ok(
          await createStoreAction({
            name: campos.name,
            address: campos.address,
            city: campos.city,
            department: campos.department ?? null,
            phone: campos.phone ?? null,
            schedule: campos.schedule ?? null,
            googleMapsUrl: campos.googleMapsUrl ?? null,
            latitude: campos.latitude ?? null,
            longitude: campos.longitude ?? null,
            isActive: campos.isActive ?? false,
            photos: campos.photos ?? [],
          })
        )
      }
      const current = (await getStoreLocations()).find((s) => s.id === storeId)
      if (!current) throw new Error("Tienda no encontrada.")
      if (Object.keys(campos).length === 1 && campos.isActive !== undefined) {
        return ok(await toggleStoreActiveAction(storeId, campos.isActive))
      }
      return ok(
        await updateStoreAction(storeId, {
          name: campos.name ?? current.name,
          address: campos.address ?? current.address,
          city: campos.city ?? current.city,
          department: campos.department !== undefined ? campos.department : current.department,
          phone: campos.phone !== undefined ? campos.phone : current.phone,
          schedule: campos.schedule !== undefined ? campos.schedule : current.schedule,
          googleMapsUrl: campos.googleMapsUrl !== undefined ? campos.googleMapsUrl : current.googleMapsUrl,
          latitude: campos.latitude !== undefined ? campos.latitude : current.latitude,
          longitude: campos.longitude !== undefined ? campos.longitude : current.longitude,
          isActive: campos.isActive ?? current.isActive,
          photos: campos.photos ?? current.photos ?? [],
          erpId: current.erpId ?? null,
        })
      )
    },
  }),
]
