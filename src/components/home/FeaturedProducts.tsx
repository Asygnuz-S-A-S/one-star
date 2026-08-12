import Link from "next/link"
import { getProducts } from "@/server/services/product.service"
import FeaturedProductsGrid from "./FeaturedProductsGrid"

export default async function FeaturedProducts({ config = {} }: { config?: Record<string, any> }) {
  const title = config.title || "Destacados"
  const limit = config.limit ? Number(config.limit) : 8
  const theme = config.theme as "light" | "dark" || "light"

  const { products } = await getProducts({ orden: "reciente" }, limit)

  if (products.length === 0) return null

  const items = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand ?? "",
    price: p.basePrice,
    salePrice: p.isOnSale && p.salePrice ? p.salePrice : undefined,
    imageUrl: p.images[0]?.url,
    secondaryImageUrl: p.images[1]?.url,
    gallery: p.images.slice(2).map((img) => img.url),
    isOnSale: p.isOnSale,
    isNew: p.isNew,
    hasStock: p.hasStock,
  }))

  const isDark = theme === "dark"
  const sectionBg = isDark ? "bg-[#1C1C1C]" : "bg-white"
  const titleColor = isDark ? "text-white" : "text-[#1C1C1C]"

  return (
    <section className={`px-4 md:px-8 lg:px-16 py-12 md:py-16 ${sectionBg}`}>
      <div className="mb-8 md:mb-12">
        <h2 className={`font-[var(--font-barlow)] font-black uppercase text-3xl md:text-4xl tracking-tight leading-none ${titleColor}`}>
          {title}
        </h2>
        <div className="w-12 h-1 bg-[#E31C23] mt-3" />
      </div>

      <FeaturedProductsGrid products={items} theme={theme} />

      <div className="text-center mt-10">
        <Link
          href="/productos"
          className={`inline-block border-2 font-[var(--font-barlow)] font-bold uppercase tracking-widest text-sm px-10 py-4 transition-colors duration-200 ${
            isDark 
              ? "border-white text-white hover:bg-white hover:text-[#1C1C1C]" 
              : "border-[#1C1C1C] text-[#1C1C1C] hover:bg-[#1C1C1C] hover:text-white"
          }`}
        >
          Ver Todos los Productos
        </Link>
      </div>
    </section>
  )
}
