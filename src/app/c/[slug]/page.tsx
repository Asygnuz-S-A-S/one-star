import { notFound } from "next/navigation"
import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import {
  getCategorySectionProductFilter,
  getUniqueBrands,
} from "@/server/services/product.service"
import { getUniqueSizes, getUniqueColors } from "@/server/services/variant.service"
import { getColorPalette } from "@/server/services/product-color.service"
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

  const sectionFilter = getCategorySectionProductFilter(category.slug)

  const [brands, sizes, colors, colorPalette] = await Promise.all([
    getUniqueBrands(),
    getUniqueSizes(),
    getUniqueColors(),
    getColorPalette(),
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
          colorPalette={colorPalette}
          currentParams={currentParams.toString()}
        />
      }
    >
      <ProductGrid
        searchParams={resolvedSearchParams}
        categorySlug={sectionFilter.categorySlug}
        extraGenders={sectionFilter.extraGenders}
        title={category.name}
        subtitle={`Colección de ${category.name.toLowerCase()}`}
        colorPalette={colorPalette}
      />
    </ShopLayout>
  )
}
