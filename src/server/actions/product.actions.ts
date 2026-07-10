"use server"

import { searchProductsByName, findProductBySlug } from "@/server/repositories/product.repository"

export async function searchProductsAction(query: string) {
  if (!query || query.length < 2) return []

  try {
    const products = await searchProductsByName(query)
    // Return only necessary fields for the autocomplete
    return products.map(p => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      imageUrl: p.images[0]?.url || null,
      secondaryImageUrl: p.images[1]?.url || null,
      price: p.basePrice
    })).slice(0, 10)
  } catch (error) {
    console.error("Error searching products:", error)
    return []
  }
}

export async function getProductsBySlugsAction(slugs: string[]) {
  if (!slugs || slugs.length === 0) return []
  
  try {
    const products = await Promise.all(
      slugs.map(slug => findProductBySlug(slug))
    )
    
    return products.filter(Boolean).map(p => ({
      id: p!.id,
      slug: p!.slug,
      name: p!.name,
      brand: p!.brand,
      price: p!.basePrice,
      salePrice: p!.isOnSale && p!.salePrice ? p!.salePrice : undefined,
      imageUrl: p!.images[0]?.url || undefined,
      secondaryImageUrl: p!.images[1]?.url || undefined,
      isOnSale: p!.isOnSale,
      hasStock: p!.variants.reduce((acc: number, v: any) => acc + (v.stock || 0), 0) > 0,
      isNew: p!.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    }))
  } catch (error) {
    console.error("Error fetching products by slugs:", error)
    return []
  }
}
