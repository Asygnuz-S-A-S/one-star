import "server-only"
import { getUniqueSizes as fetchSizes, getUniqueColors as fetchColors, countVariants as fetchCount } from "../repositories/variant.repository"
import type { Variant } from "@prisma/client"

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

export async function getUniqueSizes(): Promise<string[]> {
  return fetchSizes()
}

export async function getUniqueColors(): Promise<string[]> {
  return fetchColors()
}

export async function getTotalVariantsCount(): Promise<number> {
  return fetchCount()
}
