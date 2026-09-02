import "server-only"
import {
  findManyProducts,
  findProductCatalogCandidates,
  findProductsByIds,
  findProductBySlug,
  findProductByIdForAdmin,
  countProducts,
  fetchBrands,
  createProductRecord,
  deleteProductRecord,
  searchProductsByName,
  updateProductWithAdminRelations,
  updateProductsPublishStatus as repoUpdateProductsPublishStatus,
} from "../repositories/product.repository"
import type { Prisma, Gender } from "@prisma/client"
import { buildVisibleProductPage } from "@/server/domain/product-color-family.plan"

export interface CategoryDTO {
  id: string
  name: string
  slug: string
}

export interface ProductImageDTO {
  id: string
  url: string
  alt: string
  position: number
  /** Color de variante al que pertenece la foto. null = imagen general. */
  color: string | null
}

/**
 * Datos de la sede dueña de un nivel de inventario. La ficha de producto los
 * necesita completos para dibujar el mapa de disponibilidad, no solo el nombre.
 */
export interface InventoryStoreDTO {
  id: string
  name: string
  address: string
  city: string
  phone: string | null
  schedule: string | null
  googleMapsUrl: string | null
  latitude: number | null
  longitude: number | null
  isWebWarehouse: boolean
  isActive: boolean
}

export interface InventoryLevelDTO {
  id: string
  storeLocationId: string | null
  storeName: string | null
  /** `null` cuando el nivel corresponde a la bodega web (sin sede física). */
  storeLocation: InventoryStoreDTO | null
  stock: number
}

export interface VariantDTO {
  id: string
  sku: string
  size: string
  color: string
  stock: number // Virtual Store Stock
  inventory: InventoryLevelDTO[]
  sizeUS: string | null
  sizeCM: string | null
  sizeEUR: string | null
}

export interface CrossSellDTO {
  id: string
  slug: string
  name: string
  brandId: string | null
  brandName: string | null
  brand: string | null
  basePrice: number
  isOnSale: boolean
  salePrice: number | null
  images: ProductImageDTO[]
  variants: VariantDTO[]
}

export type ColorSiblingDTO = CrossSellDTO

export interface ProductDTO {
  id: string
  slug: string
  name: string
  brandId: string | null
  brandName: string | null
  /** Nombre de la marca (alias plano de brandName para la UI de la tienda) */
  brand: string | null
  basePrice: number
  isOnSale: boolean
  salePrice: number | null
  description: string | null
  extendedDescription: string | null
  videoUrl: string | null
  metaTitle: string | null
  metaDescription: string | null
  gender: string | null
  categoryId: string
  category: CategoryDTO
  availableOnline: boolean
  availableInStores: boolean
  isPublished: boolean
  images: ProductImageDTO[]
  variants: VariantDTO[]
  colorSiblings: ColorSiblingDTO[]
  crossSells: CrossSellDTO[]
  hasStock: boolean
  isNew: boolean
  createdAt: string
  updatedAt: string
}

export interface AppProductFilter {
  q?: string
  marca?: string
  talla?: string
  color?: string
  precio_min?: string
  precio_max?: string
  orden?: "precio_asc" | "precio_desc" | "reciente" | "antiguo"
  page?: string
  genero?: string
  categorySlug?: string
  isOnSaleOnly?: boolean
  extraGenders?: string[]
  status?: "active" | "inactive" | ""
  hasStock?: "yes" | "no" | ""
}

/**
 * Hombre y Mujer son secciones por género, no categorías de mercancía.
 * Un producto UNISEX pertenece a ambas; el resto de slugs conserva el filtro
 * normal por categoría.
 */
export function getCategorySectionProductFilter(
  slug: string
): Pick<AppProductFilter, "categorySlug" | "extraGenders"> {
  if (slug === "hombre") return { extraGenders: ["HOMBRE", "UNISEX"] }
  if (slug === "mujer") return { extraGenders: ["MUJER", "UNISEX"] }
  if (slug === "ninos") {
    return { extraGenders: ["NINO", "NINA", "INFANTIL", "BEBE"] }
  }
  return { categorySlug: slug }
}

export interface VariantInput {
  sku: string
  size: string
  color: string
  stock: number
  inventory: Array<{
    storeLocationId: string | null
    stock: number
  }>
  sizeUS?: string | null
  sizeCM?: string | null
  sizeEUR?: string | null
}

export interface ImageInput {
  url: string
  alt?: string
  position?: number
  color?: string | null
}

export interface ProductInput {
  name: string
  slug: string
  brandId?: string | null
  gender?: string | null
  categoryId: string
  description?: string | null
  extendedDescription?: string | null
  videoUrl?: string | null
  basePrice: number
  isOnSale: boolean
  salePrice?: number | null
  metaTitle?: string | null
  metaDescription?: string | null
  availableOnline: boolean
  availableInStores: boolean
  isPublished: boolean
  variants: VariantInput[]
  images: ImageInput[]
  colorFamilyProductIds?: string[]
  colorFamilyBaselineProductIds?: string[]
  crossSellIds?: string[]
}

type RawVariant = {
  id: string
  sku: string
  size: string
  color: string
  stock: number
  sizeUS: string | null
  sizeCM: string | null
  sizeEUR: string | null
  inventory?: Array<{
    id: string
    storeLocationId: string | null
    stock: number
    storeLocation?: InventoryStoreDTO | null
  }>
}

type RawImage = { id: string; url: string; alt: string; position: number; color?: string | null }

type RawPrice = { toNumber: () => number }

type RawRelatedProduct = {
  id: string
  slug: string
  name: string
  brandId: string | null
  brand: { id: string; name: string } | null
  basePrice: RawPrice
  isOnSale: boolean
  salePrice: RawPrice | null
  availableOnline?: boolean
  isPublished?: boolean
  images: RawImage[]
  variants: RawVariant[]
}

type RawProduct = {
  id: string
  slug: string
  name: string
  brandId: string | null
  brand: { id: string; name: string; slug: string } | null
  basePrice: RawPrice
  isOnSale: boolean
  salePrice: RawPrice | null
  description: string | null
  extendedDescription?: string | null
  videoUrl?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  gender?: string | null
  categoryId: string
  category: { id: string; name: string; slug: string }
  availableOnline?: boolean
  availableInStores?: boolean
  isPublished?: boolean
  images: RawImage[]
  variants: RawVariant[]
  colorFamily?: { products: RawRelatedProduct[] } | null
  crossSells?: RawRelatedProduct[]
  createdAt: Date
  updatedAt: Date
}

function mapImage(img: RawImage): ProductImageDTO {
  return {
    id: img.id,
    url: img.url,
    alt: img.alt,
    position: img.position,
    color: img.color ?? null,
  }
}

function mapVariant(v: RawVariant): VariantDTO {
  const inventory = (v.inventory ?? []).map(inv => ({
    id: inv.id,
    storeLocationId: inv.storeLocationId,
    storeName: inv.storeLocation?.name ?? null,
    storeLocation: inv.storeLocation ?? null,
    stock: inv.stock
  }))
  
  return {
    id: v.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    stock: v.stock,
    inventory,
    sizeUS: v.sizeUS ?? null,
    sizeCM: v.sizeCM ?? null,
    sizeEUR: v.sizeEUR ?? null,
  }
}

function mapRelatedProduct(raw: RawRelatedProduct): CrossSellDTO {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    brandId: raw.brandId ?? null,
    brandName: raw.brand?.name ?? null,
    brand: raw.brand?.name ?? null,
    basePrice: raw.basePrice.toNumber(),
    isOnSale: raw.isOnSale,
    salePrice: raw.salePrice ? raw.salePrice.toNumber() : null,
    images: raw.images.map(mapImage),
    variants: raw.variants.map(mapVariant),
  }
}

function mapToDTO(raw: RawProduct): ProductDTO {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    brandId: raw.brandId ?? null,
    brandName: raw.brand?.name ?? null,
    brand: raw.brand?.name ?? null,
    basePrice: raw.basePrice.toNumber(),
    isOnSale: raw.isOnSale,
    salePrice: raw.salePrice ? raw.salePrice.toNumber() : null,
    description: raw.description ?? null,
    extendedDescription: raw.extendedDescription ?? null,
    videoUrl: raw.videoUrl ?? null,
    metaTitle: raw.metaTitle ?? null,
    metaDescription: raw.metaDescription ?? null,
    gender: raw.gender ?? null,
    categoryId: raw.categoryId,
    category: {
      id: raw.category.id,
      name: raw.category.name,
      slug: raw.category.slug,
    },
    availableOnline: raw.availableOnline ?? true,
    availableInStores: raw.availableInStores ?? true,
    isPublished: raw.isPublished ?? true,
    images: raw.images.map(mapImage),
    variants: raw.variants.map(mapVariant),
    colorSiblings: (raw.colorFamily?.products ?? [])
      .filter((product) => product.id !== raw.id && product.isPublished !== false)
      .map(mapRelatedProduct),
    crossSells: (raw.crossSells ?? []).map(mapRelatedProduct),
    hasStock: raw.variants.reduce((acc, v) => acc + (v.stock || 0), 0) > 0,
    isNew: raw.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Created in last 30 days
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  }
}

function buildPrismaWhere(
  filter: AppProductFilter
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {}

  if (filter.isOnSaleOnly) where.isOnSale = true
  if (filter.categorySlug) where.category = { slug: filter.categorySlug }
  if (filter.status === "active") where.isPublished = true
  if (filter.status === "inactive") where.isPublished = false

  if (filter.hasStock === "yes") {
    where.variants = { ...where.variants, some: { ...where.variants?.some, stock: { gt: 0 } } }
  } else if (filter.hasStock === "no") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : (where.AND ? [where.AND] : [])),
      { NOT: { variants: { some: { stock: { gt: 0 } } } } }
    ] as any
  }

  if (filter.extraGenders && filter.extraGenders.length > 0) {
    where.gender = { in: filter.extraGenders as Gender[] }
  } else if (filter.genero) {
    where.gender = filter.genero as Gender
  }

  if (filter.q) where.name = { contains: filter.q, mode: "insensitive" }
  if (filter.marca) where.brand = { is: { name: { contains: filter.marca, mode: "insensitive" } } }

  const hasMin = filter.precio_min && !isNaN(Number(filter.precio_min))
  const hasMax = filter.precio_max && !isNaN(Number(filter.precio_max))
  if (hasMin || hasMax) {
    where.basePrice = {
      ...(hasMin ? { gte: Number(filter.precio_min) } : {}),
      ...(hasMax ? { lte: Number(filter.precio_max) } : {}),
    }
  }

  if (filter.talla) {
    where.variants = { some: { size: filter.talla } }
  }

  if (filter.color) {
    where.variants = {
      some: {
        ...(filter.talla ? { size: filter.talla } : {}),
        color: { contains: filter.color, mode: "insensitive" },
      },
    }
  }

  return where
}

function buildPrismaOrderBy(
  orden?: string
): Prisma.ProductOrderByWithRelationInput[] {
  if (orden === "precio_asc") return [{ basePrice: "asc" }, { id: "asc" }]
  if (orden === "precio_desc") return [{ basePrice: "desc" }, { id: "asc" }]
  if (orden === "antiguo") return [{ createdAt: "asc" }, { id: "asc" }]
  return [{ createdAt: "desc" }, { id: "asc" }]
}

export async function getProducts(
  filter: AppProductFilter,
  pageSize = 24
): Promise<{ products: ProductDTO[]; total: number }> {
  const page = Math.max(1, Number(filter.page ?? 1))
  const where = { ...buildPrismaWhere(filter), isPublished: true }
  const orderBy = buildPrismaOrderBy(filter.orden)
  const candidates = await findProductCatalogCandidates(where, orderBy)
  const visiblePage = buildVisibleProductPage(candidates, page, pageSize)
  const rows = await findProductsByIds(visiblePage.productIds)
  const rowsById = new Map(rows.map((row) => [row.id, row]))

  return {
    products: visiblePage.productIds.flatMap((id) => {
      const row = rowsById.get(id)
      return row ? [mapToDTO(row)] : []
    }),
    total: visiblePage.total,
  }
}

/**
 * El administrador trabaja con los registros ERP individuales. Por eso esta
 * consulta no colapsa las familias de color como sí lo hace el catálogo.
 */
export async function getAdminProducts(
  filter: AppProductFilter,
  pageSize = 20
): Promise<{ products: ProductDTO[]; total: number }> {
  const page = Math.max(1, Number(filter.page ?? 1))
  const where = buildPrismaWhere(filter)
  const orderBy = buildPrismaOrderBy(filter.orden)
  const [rows, total] = await Promise.all([
    findManyProducts(where, orderBy, pageSize, (page - 1) * pageSize),
    countProducts(where),
  ])

  return { products: rows.map(mapToDTO), total }
}

export async function getProductBySlug(slug: string): Promise<ProductDTO | null> {
  const raw = await findProductBySlug(slug)
  return raw && raw.isPublished !== false ? mapToDTO(raw) : null
}

export async function getTotalProductsCount(): Promise<number> {
  return countProducts()
}

export async function getUniqueBrands(): Promise<string[]> {
  return fetchBrands()
}

export async function createProduct(input: ProductInput): Promise<ProductDTO> {
  const raw = await createProductRecord({
    name: input.name,
    slug: input.slug,
    ...(input.brandId ? { brand: { connect: { id: input.brandId } } } : {}),
    gender: (input.gender as Gender) ?? null,
    category: { connect: { id: input.categoryId } },
    description: input.description ?? null,
    extendedDescription: input.extendedDescription ?? null,
    videoUrl: input.videoUrl ?? null,
    basePrice: input.basePrice,
    isOnSale: input.isOnSale,
    salePrice: input.salePrice ?? null,
    metaTitle: input.metaTitle ?? null,
    metaDescription: input.metaDescription ?? null,
    availableOnline: input.availableOnline,
    availableInStores: input.availableInStores,
    isPublished: input.isPublished,
    variants: {
      create: input.variants.map((v) => ({
        sku: v.sku,
        size: v.size,
        color: v.color,
        stock: v.stock,
        inventory: {
          create: v.inventory.map((inv) => ({
            storeLocationId: inv.storeLocationId,
            stock: inv.stock,
          })),
        },
        sizeUS: v.sizeUS ?? null,
        sizeCM: v.sizeCM ?? null,
        sizeEUR: v.sizeEUR ?? null,
      })),
    },
    images: {
      create: input.images.map((img, idx) => ({
        url: img.url,
        alt: img.alt ?? input.name,
        position: img.position ?? idx,
        color: img.color ?? null,
      })),
    },
    ...(input.crossSellIds?.length
      ? { crossSells: { connect: input.crossSellIds.map((id) => ({ id })) } }
      : {}),
  })
  return mapToDTO(raw)
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<ProductDTO> {
  const raw = await updateProductWithAdminRelations(id, input)
  return mapToDTO(raw)
}

export type AdminProductDetail = Awaited<ReturnType<typeof findProductByIdForAdmin>>

export async function getProductByIdForAdmin(id: string): Promise<AdminProductDetail> {
  return findProductByIdForAdmin(id)
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteProductRecord(id)
}

export async function updateProductsPublishStatus(
  ids: string[],
  isPublished: boolean
): Promise<number> {
  const result = await repoUpdateProductsPublishStatus(ids, isPublished)
  return result.count
}

export async function getRelatedProducts(
  categoryId: string,
  excludeSlug: string,
  take = 4
): Promise<ProductDTO[]> {
  const rows = await findManyProducts(
    { categoryId, isPublished: true, NOT: { slug: excludeSlug } },
    { createdAt: "desc" },
    take,
    0
  )
  return rows.map(mapToDTO)
}

export async function searchProducts(
  q: string,
  excludeId?: string
): Promise<Array<{
  id: string
  slug: string
  name: string
  brandId: string | null
  brandName: string | null
  colorFamilyId: string | null
  imageUrl: string | null
  color: string | null
}>> {
  const rows = await searchProductsByName(q, excludeId)
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    brandId: row.brandId,
    brandName: row.brand?.name ?? null,
    colorFamilyId: row.colorFamilyId,
    imageUrl: row.images[0]?.url ?? null,
    color: row.variants.find((variant) => variant.color.trim().length > 0)?.color ?? null,
  }))
}
