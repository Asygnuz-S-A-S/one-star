import { notFound } from "next/navigation"
import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import { getBrandBySlug } from "@/server/services/brand.service"
import { getUniqueSizes, getUniqueColors } from "@/server/services/variant.service"
import { getColorPalette } from "@/server/services/product-color.service"

interface BrandPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    q?: string
    talla?: string
    color?: string
    precio_min?: string
    precio_max?: string
    orden?: "precio_asc" | "precio_desc" | "reciente" | "antiguo"
    page?: string
    genero?: string
    categoria?: string
  }>
}

export async function generateMetadata({ params }: BrandPageProps) {
  const { slug } = await params
  const brand = await getBrandBySlug(slug)
  if (!brand) return { title: "Marca no encontrada | One Star" }
  return {
    title: `${brand.name} | One Star`,
    description: `Todos los productos ${brand.name} disponibles en One Star.`,
  }
}

/**
 * Catálogo filtrado por una marca (HU-5). Filtra por id de marca, no por
 * nombre, para que "On" no arrastre a "Converse" ni a "Columbia".
 */
export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const brand = await getBrandBySlug(slug)
  if (!brand || !brand.isActive) notFound()

  const [sizes, colors, colorPalette] = await Promise.all([
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
          brands={[]}
          sizes={sizes}
          colors={colors}
          colorPalette={colorPalette}
          currentParams={currentParams.toString()}
        />
      }
    >
      <ProductGrid
        searchParams={resolvedSearchParams}
        brandId={brand.id}
        title={brand.name}
        subtitle={`Todos los productos ${brand.name}`}
        colorPalette={colorPalette}
      />
    </ShopLayout>
  )
}
