import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import { getCatalogPriceBounds, getUniqueBrands } from "@/server/services/product.service"
import { getUniqueSizes, getUniqueColors } from "@/server/services/variant.service"
import { getColorPalette } from "@/server/services/product-color.service"
import type { ProductSortValue } from "@/lib/product-sort"

interface SalePageProps {
  searchParams: Promise<{
    q?: string
    marca?: string
    talla?: string
    color?: string
    precio_min?: string
    precio_max?: string
    orden?: ProductSortValue
    page?: string
  }>
}

export const metadata = {
  title: "SALE | One Star",
  description: "Ofertas y descuentos en calzado. Solo por tiempo limitado.",
}

export default async function SalePage({ searchParams }: SalePageProps) {
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
        isOnSaleOnly
        title="SALE"
        eyebrow="Ofertas One Star"
        subtitle="Descuentos por tiempo limitado en tenis y accesorios seleccionados. Cuando se agotan, no vuelven."
        // Carbón con acento rojo: el rojo queda para precios y CTA, como pide el manual de marca.
        headerClassName="bg-[#1C1C1C] text-white [&_h1]:text-white [&_p]:text-white/70 before:pointer-events-none before:absolute before:-right-6 before:top-1/2 before:-translate-y-1/2 before:font-barlow before:text-[11rem] before:font-black before:leading-none before:text-white/[0.06] before:content-['%'] md:before:text-[16rem]"
        colorPalette={colorPalette}
      />
    </ShopLayout>
  )
}
