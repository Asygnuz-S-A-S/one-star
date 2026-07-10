import "server-only"
import {
  findManyBrands,
  findBrandById,
  createBrandRecord,
  updateBrandRecord,
  deleteBrandRecord,
} from "../repositories/brand.repository"
import type { Brand } from "@prisma/client"
import { slugify } from "@/lib/utils"

export interface BrandDTO {
  id: string
  name: string
  slug: string
  erpId: string | null
  logoUrl: string | null
  isActive: boolean
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

export async function getAllBrands(activeOnly = false): Promise<BrandDTO[]> {
  const brands = await findManyBrands(activeOnly ? { isActive: true } : undefined)
  return brands.map(mapToDTO)
}

export async function getBrandById(id: string): Promise<BrandDTO | null> {
  const brand = await findBrandById(id)
  return brand ? mapToDTO(brand) : null
}

export async function createBrand(input: {
  name: string
  slug?: string
  logoUrl?: string | null
  isActive?: boolean
}): Promise<BrandDTO> {
  const slug = input.slug || slugify(input.name)
  const brand = await createBrandRecord({
    name: input.name,
    slug,
    logoUrl: input.logoUrl ?? null,
    isActive: input.isActive ?? true,
  })
  return mapToDTO(brand)
}

export async function updateBrand(
  id: string,
  input: { name?: string; slug?: string; logoUrl?: string | null; isActive?: boolean }
): Promise<BrandDTO> {
  const brand = await updateBrandRecord(id, input)
  return mapToDTO(brand)
}

export async function deleteBrand(id: string): Promise<void> {
  await deleteBrandRecord(id)
}
