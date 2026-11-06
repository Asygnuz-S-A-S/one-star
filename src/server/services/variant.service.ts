import "server-only"
import { getUniqueSizes as fetchSizes, getUniqueColors as fetchColors, countVariants as fetchCount } from "../repositories/variant.repository"
import type { Variant } from "@prisma/client"
import { getCatalogRules } from "./store-settings.service"
import { compareSizes, dedupeColors } from "@/lib/catalog-facets"

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

export function mapVariantToDTO(variant: Variant): VariantDTO {
  return {
    id: variant.id,
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    stock: variant.stock,
    sizeUS: variant.sizeUS,
    sizeCM: variant.sizeCM,
    sizeEUR: variant.sizeEUR,
  }
}

/** Facetas del catálogo público: siguen la regla de ocultar productos sin foto. */
async function facetOptions(brandId?: string) {
  const { hideImagelessProducts } = await getCatalogRules()
  return { brandId, requireImage: hideImagelessProducts }
}

export async function getUniqueSizes(brandId?: string): Promise<string[]> {
  return (await fetchSizes(await facetOptions(brandId))).sort(compareSizes)
}

export async function getUniqueColors(brandId?: string): Promise<string[]> {
  return dedupeColors(await fetchColors(await facetOptions(brandId)))
}

export async function getTotalVariantsCount(): Promise<number> {
  return fetchCount()
}
