"use server"

import { getStorefrontBrands } from "@/server/services/brand.service"

/** Marcas que la tienda vende hoy, para el campo "marca de preferencia". */
export async function getPreferredBrandOptions(): Promise<string[]> {
  const brands = await getStorefrontBrands().catch(() => [])
  return brands.map((brand) => brand.name)
}
