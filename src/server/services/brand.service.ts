import "server-only"
import {
  findManyBrands,
  findBrandById,
  findBrandBySlug,
  findActiveBrandsWithPublishedProducts,
  createBrandRecord,
  updateBrandRecord,
  deleteBrandRecord,
} from "../repositories/brand.repository"
import type { Brand } from "@prisma/client"
import { slugify } from "@/lib/utils"
import { parseProductFaqs, type ProductFaq } from "@/lib/product-faq"

export interface BrandDTO {
  id: string
  name: string
  slug: string
  erpId: string | null
  logoUrl: string | null
  isActive: boolean
}

export interface BrandDetailDTO extends BrandDTO {
  bannerUrl: string | null
  description: string | null
  story: string | null
  metaTitle: string | null
  metaDescription: string | null
  highlights: string[]
  faqs: ProductFaq[]
}

function mapToDTO(brand: Brand): BrandDTO {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    erpId: brand.erpId,
    logoUrl: brand.logoUrl,
    isActive: brand.isActive,
  }
}

function mapToDetailDTO(brand: Brand): BrandDetailDTO {
  return {
    ...mapToDTO(brand),
    bannerUrl: brand.bannerUrl,
    description: brand.description,
    story: brand.story,
    metaTitle: brand.metaTitle,
    metaDescription: brand.metaDescription,
    highlights: brand.highlights ?? [],
    faqs: parseProductFaqs(brand.faqs),
  }
}

export async function getAllBrands(activeOnly = false): Promise<BrandDTO[]> {
  const brands = await findManyBrands(activeOnly ? { isActive: true } : undefined)
  return brands.map(mapToDTO)
}

export async function getAllBrandsWithDetails(activeOnly = false): Promise<BrandDetailDTO[]> {
  const brands = await findManyBrands(activeOnly ? { isActive: true } : undefined)
  return brands.map(mapToDetailDTO)
}

export async function getBrandById(id: string): Promise<BrandDTO | null> {
  const brand = await findBrandById(id)
  return brand ? mapToDTO(brand) : null
}

export async function getBrandDetailById(id: string): Promise<BrandDetailDTO | null> {
  const brand = await findBrandById(id)
  return brand ? mapToDetailDTO(brand) : null
}

export async function getBrandBySlug(slug: string): Promise<BrandDTO | null> {
  const brand = await findBrandBySlug(slug)
  return brand ? mapToDTO(brand) : null
}

export async function getBrandDetailBySlug(slug: string): Promise<BrandDetailDTO | null> {
  const brand = await findBrandBySlug(slug)
  return brand ? mapToDetailDTO(brand) : null
}

export interface StorefrontBrandDTO extends BrandDTO {
  /** Productos publicados de la marca. */
  productCount: number
}

/** Marcas para el directorio público: activas y con productos publicados. */
export async function getStorefrontBrands(): Promise<StorefrontBrandDTO[]> {
  const brands = await findActiveBrandsWithPublishedProducts()
  return brands.map((brand) => ({ ...mapToDTO(brand), productCount: brand._count.products }))
}

export async function createBrand(input: {
  name: string
  slug?: string
  logoUrl?: string | null
  bannerUrl?: string | null
  description?: string | null
  story?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  highlights?: string[]
  faqs?: unknown
  isActive?: boolean
}): Promise<BrandDetailDTO> {
  const slug = input.slug || slugify(input.name)
  const dataToCreate: Record<string, unknown> = {
    name: input.name,
    slug,
    logoUrl: input.logoUrl ?? null,
    isActive: input.isActive ?? true,
  }
  if (input.bannerUrl !== undefined) dataToCreate.bannerUrl = input.bannerUrl
  if (input.description !== undefined) dataToCreate.description = input.description
  if (input.story !== undefined) dataToCreate.story = input.story
  if (input.metaTitle !== undefined) dataToCreate.metaTitle = input.metaTitle
  if (input.metaDescription !== undefined) dataToCreate.metaDescription = input.metaDescription
  if (input.highlights !== undefined) dataToCreate.highlights = input.highlights
  if (input.faqs !== undefined) dataToCreate.faqs = input.faqs

  const brand = await createBrandRecord(dataToCreate as never)
  return mapToDetailDTO(brand)
}

export async function updateBrand(
  id: string,
  input: {
    name?: string
    slug?: string
    logoUrl?: string | null
    bannerUrl?: string | null
    description?: string | null
    story?: string | null
    metaTitle?: string | null
    metaDescription?: string | null
    highlights?: string[]
    faqs?: unknown
    isActive?: boolean
  }
): Promise<BrandDetailDTO> {
  const slug = input.name ? slugify(input.name) : input.slug
  const dataToUpdate: Record<string, unknown> = {}
  if (input.name !== undefined) dataToUpdate.name = input.name
  if (slug !== undefined) dataToUpdate.slug = slug
  if (input.logoUrl !== undefined) dataToUpdate.logoUrl = input.logoUrl
  if (input.bannerUrl !== undefined) dataToUpdate.bannerUrl = input.bannerUrl
  if (input.description !== undefined) dataToUpdate.description = input.description
  if (input.story !== undefined) dataToUpdate.story = input.story
  if (input.metaTitle !== undefined) dataToUpdate.metaTitle = input.metaTitle
  if (input.metaDescription !== undefined) dataToUpdate.metaDescription = input.metaDescription
  if (input.highlights !== undefined) dataToUpdate.highlights = input.highlights
  if (input.faqs !== undefined) dataToUpdate.faqs = input.faqs
  if (input.isActive !== undefined) dataToUpdate.isActive = input.isActive

  const brand = await updateBrandRecord(id, dataToUpdate)
  return mapToDetailDTO(brand)
}

export async function deleteBrand(id: string): Promise<void> {
  await deleteBrandRecord(id)
}
