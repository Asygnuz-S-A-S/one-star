import "server-only"
import {
  findManyProducts,
  findProductBySlug,
  findProductByIdForAdmin,
  countProducts,
  getUniqueBrands as fetchBrands,
  createProductRecord,
  updateProductRecord,
  deleteProductRecord,
  deleteVariantsByProduct,
  deleteImagesByProduct,
  searchProductsByName,
  runInTransaction,
} from "../repositories/product.repository"
import type { Prisma, Gender } from "@prisma/client"

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
}

export interface VariantDTO {
  id: string
  sku: string
  size: string
  color: string
  stock: number
  sizeUS: string | null
  sizeCM: string | null
  sizeEUR: string | null
}

export interface CrossSellDTO {
  id: string
  slug: string
  name: string
  brand: string | null
  basePrice: number
  isOnSale: boolean
  salePrice: number | null
  images: ProductImageDTO[]
  variants: VariantDTO[]
}

export interface ProductDTO {
  id: string
  slug: string
  name: string
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
  images: ProductImageDTO[]
  variants: VariantDTO[]
  crossSells: CrossSellDTO[]
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
}

export interface VariantInput {
  sku: string
  size: string
  color: string
  stock: number
  sizeUS?: string | null
  sizeCM?: string | null
  sizeEUR?: string | null
}

export interface ImageInput {
  url: string
  alt?: string
  position?: number
}

export interface ProductInput {
  name: string
  slug: string
  brand?: string | null
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
  variants: VariantInput[]
  images: ImageInput[]
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
}

type RawImage = { id: string; url: string; alt: string; position: number }

type RawPrice = { toNumber: () => number }

type RawProduct = {
  id: string
  slug: string
  name: string
  brand: string | null
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
  images: RawImage[]
  variants: RawVariant[]
  crossSells?: Array<{
    id: string
    slug: string
    name: string
    brand: string | null
    basePrice: RawPrice
    isOnSale: boolean
    salePrice: RawPrice | null
    images: RawImage[]
    variants: RawVariant[]
  }>
  createdAt: Date
  updatedAt: Date
}

function mapVariant(v: RawVariant): VariantDTO {
  return {
    id: v.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    stock: v.stock,
    sizeUS: v.sizeUS ?? null,
    sizeCM: v.sizeCM ?? null,
    sizeEUR: v.sizeEUR ?? null,
  }
}

function mapToDTO(raw: RawProduct): ProductDTO {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    brand: raw.brand ?? null,
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
    images: raw.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      position: img.position,
    })),
    variants: raw.variants.map(mapVariant),
    crossSells: (raw.crossSells ?? []).map((cs) => ({
      id: cs.id,
      slug: cs.slug,
      name: cs.name,
      brand: cs.brand ?? null,
      basePrice: cs.basePrice.toNumber(),
      isOnSale: cs.isOnSale,
      salePrice: cs.salePrice ? cs.salePrice.toNumber() : null,
      images: cs.images.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        position: img.position,
      })),
      variants: cs.variants.map(mapVariant),
    })),
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

  if (filter.extraGenders && filter.extraGenders.length > 0) {
    where.gender = { in: filter.extraGenders as Gender[] }
  } else if (filter.genero) {
    where.gender = filter.genero as Gender
  }

  if (filter.q) where.name = { contains: filter.q, mode: "insensitive" }
  if (filter.marca) where.brand = { contains: filter.marca, mode: "insensitive" }

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
): Prisma.ProductOrderByWithRelationInput {
  if (orden === "precio_asc") return { basePrice: "asc" }
  if (orden === "precio_desc") return { basePrice: "desc" }
  if (orden === "antiguo") return { createdAt: "asc" }
  return { createdAt: "desc" }
}

export async function getProducts(
  filter: AppProductFilter,
  pageSize = 24
): Promise<{ products: ProductDTO[]; total: number }> {
  const page = Math.max(1, Number(filter.page ?? 1))
  const skip = (page - 1) * pageSize
  const where = buildPrismaWhere(filter)
  const orderBy = buildPrismaOrderBy(filter.orden)

  const [rows, total] = await Promise.all([
    findManyProducts(where, orderBy, pageSize, skip),
    countProducts(where),
  ])

  return { products: rows.map(mapToDTO), total }
}

export async function getProductBySlug(slug: string): Promise<ProductDTO | null> {
  const raw = await findProductBySlug(slug)
  return raw ? mapToDTO(raw) : null
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
    brand: input.brand ?? null,
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
    variants: {
      create: input.variants.map((v) => ({
        sku: v.sku,
        size: v.size,
        color: v.color,
        stock: v.stock,
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
  const raw = await runInTransaction(async (tx) => {
    await tx.variant.deleteMany({ where: { productId: id } })
    await tx.productImage.deleteMany({ where: { productId: id } })

    return tx.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        brand: input.brand ?? null,
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
        variants: {
          create: input.variants.map((v) => ({
            sku: v.sku,
            size: v.size,
            color: v.color,
            stock: v.stock,
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
          })),
        },
        crossSells: {
          set: (input.crossSellIds ?? []).map((csId) => ({ id: csId })),
        },
      },
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        variants: true,
      },
    })
  })
  return mapToDTO(raw)
}

export type AdminProductDetail = Awaited<ReturnType<typeof findProductByIdForAdmin>>

export async function getProductByIdForAdmin(id: string): Promise<AdminProductDetail> {
  return findProductByIdForAdmin(id)
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteProductRecord(id)
}

export async function getRelatedProducts(
  categoryId: string,
  excludeSlug: string,
  take = 4
): Promise<ProductDTO[]> {
  const rows = await findManyProducts(
    { categoryId, NOT: { slug: excludeSlug } },
    { createdAt: "desc" },
    take,
    0
  )
  return rows.map(mapToDTO)
}

export async function searchProducts(
  q: string,
  excludeId?: string
): Promise<{ id: string; name: string; brand: string | null }[]> {
  return searchProductsByName(q, excludeId)
}
