import { notFound } from "next/navigation"
import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import { getUniqueBrands } from "@/server/services/product.service"
import { getUniqueSizes, getUniqueColors } from "@/server/services/variant.service"
import { getCategoryBySlug } from "@/server/services/category.service"

interface CategoryPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    q?: string
    marca?: string
    talla?: string
    color?: string
    precio_min?: string
    precio_max?: string
    orden?: "precio_asc" | "precio_desc" | "reciente" | "antiguo"
    page?: string
  }>
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const resolvedParams = await params
  const category = await getCategoryBySlug(resolvedParams.slug)

  if (!category) {
    return {
      title: "Categoría no encontrada | One Star",
    }
  }

  return {
    title: `${category.name} | One Star`,
    description: `Descubre nuestra colección de ${category.name.toLowerCase()}.`,
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  const category = await getCategoryBySlug(resolvedParams.slug)

  if (!category) {
    notFound()
  }

  const [brands, sizes, colors] = await Promise.all([
    getUniqueBrands(),
    getUniqueSizes(),
    getUniqueColors(),
  ])

  const currentParams = new URLSearchParams(
    Object.entries(resolvedSearchParams).filter(([, v]) => v !== undefined) as [string, string][]
  )

  return (
    <ShopLayout
      sidebar={
        <FilterSidebar
          brands={brands}
          sizes={sizes}
          colors={colors}
          currentParams={currentParams.toString()}
        />
      }
    >
      <ProductGrid
        searchParams={resolvedSearchParams}
        categorySlug={category.slug}
        title={category.name}
        subtitle={`Colección de ${category.name.toLowerCase()}`}
      />
    </ShopLayout>
  )
}
