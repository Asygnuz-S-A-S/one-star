import Link from "next/link"
import ProductCard from "@/components/home/ProductCard"
import type { CrossSellProduct } from "@/types/shop"

interface CrossSellingProps {
  products: CrossSellProduct[]
  title?: string
}

export default function CrossSelling({ products, title = "COMPLETA TU LOOK" }: CrossSellingProps) {
  if (products.length === 0) return null

  return (
    <section className="py-12">
      <h2 className="font-[var(--font-barlow)] font-bold text-xl md:text-2xl uppercase tracking-widest text-[#1C1C1C] mb-6">
        {title}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible scrollbar-hide">
        {products.map((product) => {
          const image = product.images[0]
          const secondaryImage = product.images[1]
          return (
            <Link
              key={product.id}
              href={`/productos/${product.slug}`}
              className="flex-shrink-0 w-48 md:w-auto"
            >
              <ProductCard
                id={product.id}
                name={product.name}
                brand={product.brand ?? ""}
                price={Number(product.basePrice)}
                salePrice={product.salePrice ? Number(product.salePrice) : undefined}
                imageUrl={image?.url}
                secondaryImageUrl={secondaryImage?.url}
                isOnSale={product.isOnSale} isNew={product.isNew} hasStock={product.hasStock}
              />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
