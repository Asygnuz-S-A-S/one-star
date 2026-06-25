import Link from "next/link"
import { getProducts } from "@/server/services/product.service"
import FeaturedProductsGrid from "./FeaturedProductsGrid"

export default async function FeaturedProducts() {
  const { products } = await getProducts({ orden: "reciente" }, 8)

  if (products.length === 0) return null

  const items = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand ?? "",
    price: p.basePrice,
    salePrice: p.isOnSale && p.salePrice ? p.salePrice : undefined,
    imageUrl: p.images[0]?.url,
    isOnSale: p.isOnSale,
  }))

  return (
    <section className="px-4 md:px-8 lg:px-16 py-12 md:py-16">
      <div className="mb-8 md:mb-12">
        <h2 className="font-[var(--font-barlow)] font-black uppercase text-3xl md:text-4xl text-[#1C1C1C] tracking-tight leading-none">
          Destacados
        </h2>
        <div className="w-12 h-1 bg-[#E31C23] mt-3" />
      </div>

      <FeaturedProductsGrid products={items} />

      <div className="text-center mt-10">
        <Link
          href="/productos"
          className="inline-block border-2 border-[#1C1C1C] text-[#1C1C1C] font-[var(--font-barlow)] font-bold uppercase tracking-widest text-sm px-10 py-4 hover:bg-[#1C1C1C] hover:text-white transition-colors duration-200"
        >
          Ver Todos los Productos
        </Link>
      </div>
    </section>
  )
}
