import type { Metadata } from "next"
import ProductGrid from "@/components/shop/ProductGrid"
import { getSiteUrl } from "@/lib/site-url"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import { getCatalogPriceBounds, getUniqueBrands } from "@/server/services/product.service"
import { getUniqueSizes, getUniqueColors } from "@/server/services/variant.service"
import { getColorPalette } from "@/server/services/product-color.service"
import type { ProductSortValue } from "@/lib/product-sort"

interface ProductosPageProps {
  searchParams: Promise<{
    q?: string
    marca?: string
    talla?: string
    color?: string
    precio_min?: string
    precio_max?: string
    orden?: ProductSortValue
    page?: string
    genero?: string
    categoria?: string
  }>
}

const GENDER_TITLES: Record<string, string> = { hombre: "para hombre", mujer: "para mujer", ninos: "para niños", unisex: "unisex" }

/** Filtros, orden y paginación son el mismo listado: solo la URL limpia (o la del género) se indexa. */
export async function generateMetadata({ searchParams }: ProductosPageProps): Promise<Metadata> {
  const genero = (await searchParams).genero?.trim().toLowerCase() ?? ""
  const siteUrl = getSiteUrl()
  const gender = GENDER_TITLES[genero]
  if (!gender) {
    return {
      title: "Productos | One Star",
      description: "Explora todo el catálogo de calzado One Star.",
      alternates: { canonical: `${siteUrl}/productos` },
    }
  }
  return {
    title: `Tenis ${gender} | One Star`,
    description: `Tenis y calzado ${gender} de Vans, Converse, HOKA y Skechers en One Star. Envío a todo Colombia.`,
    alternates: { canonical: `${siteUrl}/productos?genero=${genero}` },
  }
}

export default async function ProductosPage({ searchParams }: ProductosPageProps) {
  const resolvedSearchParams = await searchParams
  const [brands, sizes, colors, colorPalette, priceBounds] = await Promise.all([
    getUniqueBrands(),
    getUniqueSizes(),
    getUniqueColors(),
    getColorPalette(),
    getCatalogPriceBounds(),
  ])

  const currentParams = new URLSearchParams(
    Object.entries(resolvedSearchParams).filter(([, v]) => v !== undefined) as [string, string][]
  )

  return (
    <ShopLayout
      sidebar={
        <FilterSidebar
          key={currentParams.toString()}
          brands={brands}
          sizes={sizes}
          colors={colors}
          colorPalette={colorPalette}
          priceBounds={priceBounds}
          currentParams={currentParams.toString()}
        />
      }
    >
      <ProductGrid
        searchParams={resolvedSearchParams}
        title="PRODUCTOS"
        subtitle="Todo el catálogo One Star"
        colorPalette={colorPalette}
      />
    </ShopLayout>
  )
}
