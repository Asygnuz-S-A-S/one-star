import "server-only"

import { z } from "zod"
import type { LandingSectionType, Prisma } from "@prisma/client"
import { requireAdmin } from "@/server/auth/require-admin"
import { faqsToText, parseProductFaqs } from "@/lib/product-faq"
import { searchProducts, updateProduct, bulkToggleProductsPublishStatus } from "@/app/admin/productos/actions"
import { createBrandAction, updateBrandAction } from "@/app/admin/marcas/actions"
import { createCategoryAction, updateCategoryAction } from "@/server/actions/category.actions"
import { createColorAction, updateColorAction } from "@/server/actions/product-color.actions"
import { createBanner, toggleBannerActive, updateBanner } from "@/server/actions/banner.actions"
import { updateTopBannerAction } from "@/server/actions/top-banner.actions"
import { getMediaAssetsAction } from "@/server/actions/media-asset.actions"
import {
  createLandingSectionAction,
  publishLandingPageAction,
  toggleLandingSectionActiveAction,
  updateLandingSectionConfigAction,
  updateLandingSectionPositionsAction,
} from "@/server/actions/landing.actions"
import { getProductByIdForAdmin, type AdminProductDetail } from "@/server/services/product.service"
import { getCategories } from "@/server/services/category.service"
import { getAllBrands, getBrandDetailById, type BrandDetailDTO } from "@/server/services/brand.service"
import { getProductColorsForAdmin } from "@/server/services/product-color.service"
import { getStoreLocations } from "@/server/services/store.service"
import { isErpCatalogOwner } from "@/server/services/catalog-source.service"
import { getAllBanners } from "@/server/services/banner.service"
import { getTopBanner } from "@/server/services/top-banner.service"
import { getAllLandingSections, getLandingPages } from "@/server/services/landing-section.service"
import { getStorageAdapter } from "@/server/storage/storage.container"
import { createMediaAsset } from "@/server/services/media-asset.service"
import { LandingSectionTypeSchema } from "@/server/validators/landing-section.validator"

/**
 * Herramientas del conector MCP. Es una LISTA BLANCA: nada de pedidos, clientes,
 * leads, PQRS, newsletter, usuarios ni cupones (regla de empresa). Cada herramienta
 * llama a la misma acción o servicio del admin, que vuelve a exigir requireAdmin(área).
 */
export interface McpTool {
  name: string
  description: string
  /** Área mínima para ver y usar la herramienta. */
  area: "inventory" | "superadmin"
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

// ---------------------------------------------------------------- productos

const productChangesSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  extendedDescription: z.string().max(20000).nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  basePrice: z.number().nonnegative().optional(),
  isOnSale: z.boolean().optional(),
  salePrice: z.number().nonnegative().nullable().optional(),
  metaTitle: z.string().max(200).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  categoryId: id.optional(),
  brandId: id.nullable().optional(),
  gender: z.string().max(40).nullable().optional(),
  highlights: z.array(z.string().max(200)).max(8).optional(),
  faqs: z.array(z.object({ q: z.string().max(300), a: z.string().max(1500) })).max(12).optional(),
  images: z
    .array(z.object({ url: z.string().url(), alt: z.string().max(200).optional(), color: z.string().max(60).nullable().optional() }))
    .max(40)
    .optional()
    .describe("Reemplaza TODAS las fotos, en este orden. Usa subir_imagen antes para tener la URL de Cloudinary."),
})

export type ProductChanges = z.infer<typeof productChangesSchema>

type StoreRef = { id: string; erpId: string | null }

/**
 * Arma el mismo FormData que envía ProductForm.tsx al guardar, con el producto
 * actual y solo los `changes` pedidos. Variantes, inventario por sede, familia de
 * color y cross-sells pasan intactos (si faltaran, el guardado los borraría).
 */
export function productFormData(
  product: NonNullable<AdminProductDetail>,
  stores: StoreRef[],
  erpOwner: boolean,
  changes: ProductChanges
): FormData {
  const merged = { ...product, ...changes }
  const erpStoreIds = new Set(erpOwner ? stores.filter((store) => store.erpId).map((store) => store.id) : [])

  const variants = product.variants.map((v) => {
    const web = v.inventory.find((inv) => inv.storeLocationId === null)
    const inventory = [
      { storeLocationId: null as string | null, stock: web ? web.stock : v.stock || 0 },
      ...stores.map((store) => ({
        storeLocationId: store.id as string | null,
        stock: v.inventory.find((inv) => inv.storeLocationId === store.id)?.stock ?? 0,
      })),
    ]
    return {
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      stock: inventory[0].stock,
      inventory: inventory.filter((inv) => inv.storeLocationId === null || !erpStoreIds.has(inv.storeLocationId)),
      sizeUS: v.sizeUS ?? "",
      sizeCM: v.sizeCM ?? "",
      sizeEUR: v.sizeEUR ?? "",
    }
  })

  const images = changes.images
    ? changes.images.map((img, idx) => ({ url: img.url, alt: img.alt ?? merged.name, position: idx, color: img.color ?? null }))
    : product.images.map((img, idx) => ({ id: img.id, url: img.url, alt: img.alt, position: img.position ?? idx, color: img.color ?? null }))

  const familyIds = product.colorFamily?.products.filter((item) => item.id !== product.id).map((item) => item.id) ?? []
  const salePrice = merged.salePrice
  const faqs = changes.faqs ?? parseProductFaqs(product.faqs)

  return toFormData({
    name: merged.name,
    slug: product.slug,
    brandId: merged.brandId ?? "",
    gender: merged.gender ?? "",
    categoryId: merged.categoryId,
    description: merged.description ?? "",
    extendedDescription: merged.extendedDescription ?? "",
    videoUrl: merged.videoUrl ?? "",
    basePrice: String(Number(merged.basePrice)),
    isOnSale: String(merged.isOnSale),
    salePrice: salePrice != null ? String(Number(salePrice)) : "",
    metaTitle: merged.metaTitle ?? "",
    metaDescription: merged.metaDescription ?? "",
    availableOnline: String(product.availableOnline),
    availableInStores: String(product.availableInStores),
    isPublished: String(product.isPublished),
    highlights: (changes.highlights ?? product.highlights ?? []).join("\n"),
    faqs: faqsToText(faqs),
    variants: JSON.stringify(variants),
    images: JSON.stringify(images),
    colorFamilyProductIds: JSON.stringify(familyIds),
    colorFamilyBaselineProductIds: JSON.stringify(familyIds),
    crossSellIds: JSON.stringify(product.crossSells.map((cs) => cs.id)),
  })
}

async function loadProduct(productId: string) {
  await requireAdmin("inventory")
  const product = await getProductByIdForAdmin(productId)
  if (!product) throw new Error("Producto no encontrado.")
  return product
}

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

// ---------------------------------------------------------------- lista

export const MCP_TOOLS: McpTool[] = [
  tool({
    name: "buscar_productos",
    description: "Busca productos del catálogo por nombre. Devuelve id, nombre, marca e imagen.",
    area: "inventory",
    readOnly: true,
    live: false,
    input: z.object({ q: z.string().trim().min(1).max(100) }),
    run: ({ q }) => searchProducts(q),
  }),
  tool({
    name: "ver_producto",
    description: "Detalle editable de un producto: textos, precios, fotos, variantes y estado de publicación.",
    area: "inventory",
    readOnly: true,
    live: false,
    input: z.object({ id }),
    run: async ({ id: productId }) => {
      const p = await loadProduct(productId)
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
    description: "Categorías, marcas y colores con sus id (para usar en editar_producto y en las tarjetas).",
    area: "inventory",
    readOnly: true,
    live: false,
    input: z.object({}),
    run: async () => {
      await requireAdmin("inventory")
      const [categorias, marcas, colores] = await Promise.all([getCategories(), getAllBrands(), getProductColorsForAdmin()])
      return { categorias, marcas, colores }
    },
  }),
  tool({
    name: "editar_producto",
    description:
      "Cambia campos de un producto (solo los que envíes; variantes e inventario no se tocan). Si el producto está publicado, el cambio sale en la tienda al instante.",
    area: "inventory",
    readOnly: false,
    live: true,
    input: z.object({ id, cambios: productChangesSchema }),
    run: async ({ id: productId, cambios }) => {
      const product = await loadProduct(productId)
      const [stores, erpOwner] = await Promise.all([getStoreLocations(), isErpCatalogOwner()])
      return ok(await updateProduct(productId, productFormData(product, stores, erpOwner, cambios)))
    },
  }),
  tool({
    name: "publicar_productos",
    description: "Publica (publicar: true) o retira de la tienda (false) uno o varios productos.",
    area: "inventory",
    readOnly: false,
    live: true,
    input: z.object({ ids: z.array(id).min(1).max(100), publicar: z.boolean() }),
    run: async ({ ids, publicar }) => ok(await bulkToggleProductsPublishStatus(ids, publicar)),
  }),
  tool({
    name: "guardar_categoria",
    description: "Crea una categoría (sin id) o renombra una existente (con id).",
    area: "inventory",
    readOnly: false,
    live: true,
    input: z.object({ id: id.optional(), name: z.string().trim().min(1).max(120), slug: z.string().trim().min(1).max(120) }),
    run: async ({ id: categoryId, name, slug }) =>
      ok(categoryId ? await updateCategoryAction(categoryId, name, slug) : await createCategoryAction(name, slug)),
  }),
  tool({
    name: "guardar_marca",
    description: "Crea una marca (sin id) o cambia campos de una existente (con id; lo no enviado se conserva).",
    area: "inventory",
    readOnly: false,
    live: true,
    input: z.object({ id: id.optional(), campos: brandFieldsSchema }),
    run: async ({ id: brandId, campos }) => {
      await requireAdmin("inventory")
      if (!brandId) return ok(await createBrandAction(brandFormData({}, campos)))
      const current = await getBrandDetailById(brandId)
      if (!current) throw new Error("Marca no encontrada.")
      return ok(await updateBrandAction(brandId, brandFormData(current, campos)))
    },
  }),
  tool({
    name: "guardar_color",
    description: "Crea un color (sin id) o edita uno existente (con id).",
    area: "inventory",
    readOnly: false,
    live: true,
    input: z.object({
      id: id.optional(),
      name: z.string().trim().min(1).max(40),
      hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      isActive: z.boolean().default(true),
    }),
    run: async ({ id: colorId, name, hex, isActive }) => {
      const fd = toFormData({ name, hex, isActive: String(isActive) })
      return ok(colorId ? await updateColorAction(colorId, fd) : await createColorAction(fd))
    },
  }),
  tool({
    name: "subir_imagen",
    description:
      "Sube a Cloudinary (carpeta one-star/productos) una imagen o video desde una URL https pública y la registra en Archivos. Devuelve la URL para usar en productos, banners o secciones. Para fotos del computador usa POST /api/mcp/upload.",
    area: "inventory",
    readOnly: false,
    live: false,
    input: z.object({
      url: z
        .string()
        .url()
        .refine((value) => value.startsWith("https://"), "La URL debe ser https.")
        // shortcut: se valida por extensión, no por contenido; si hace falta subir URLs sin extensión, revisar el resource_type que devuelve Cloudinary.
        .refine((value) => mediaExtension.test(new URL(value).pathname), "La URL debe terminar en .jpg, .png, .webp, .gif, .avif, .mp4, .mov o .webm."),
      nombre: z.string().trim().max(120).optional(),
    }),
    run: async ({ url, nombre }) => {
      await requireAdmin("inventory")
      // Cloudinary descarga la URL desde su infraestructura: este servidor no hace fetch (sin SSRF).
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

  // ---- Contenido de la tienda: solo Super Admin, igual que en el admin.
  tool({
    name: "ver_pagina",
    description:
      "Secciones del constructor de una página (Inicio u otra campaña) con lo publicado (config) y el borrador pendiente (draftConfig). Incluye las tarjetas de colección (CATEGORY_GRID).",
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
      "Guarda la configuración COMPLETA de una sección como borrador (parte de draftConfig, o de config si no hay borrador). NO publica: la tienda no cambia hasta usar publicar_pagina.",
    area: "superadmin",
    readOnly: false,
    live: false,
    input: z.object({ id, config: z.record(z.string(), z.unknown()) }),
    run: async ({ id: sectionId, config }) =>
      ok(await updateLandingSectionConfigAction(sectionId, config as Prisma.InputJsonValue)),
  }),
  tool({
    name: "crear_seccion",
    description: "Crea una sección nueva al final de la página, INACTIVA y con contenido de ejemplo. Edítala con guardar_borrador_seccion y actívala con activar_seccion.",
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
    // toggleBannerActive invierte el estado que recibe, por eso se le pasa el contrario.
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
          isActive: changes.isActive ?? current?.isActive ?? false,
        })
      )
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
    run: async ({ tipo, buscar, limite }) =>
      ok(await getMediaAssetsAction({ fileType: tipo, search: buscar, limit: limite })).data,
  }),
]
