import Link from "next/link"
import ProductCard from "@/components/home/ProductCard"
import { getRelatedProducts } from "@/server/services/product.service"

interface RelatedProductsProps {
  categoryId: string
  excludeSlug: string
}

export default async function RelatedProducts({
  categoryId,
  excludeSlug,
}: RelatedProductsProps) {
  const products = await getRelatedProducts(categoryId, excludeSlug)

  if (products.length === 0) return null

  return (
    <section className="py-12 border-t border-[#E0E0E0]">
      <h2 className="font-[var(--font-barlow)] font-bold text-xl md:text-2xl uppercase tracking-widest text-[#1C1C1C] mb-6">
        TAMBIÉN TE PUEDE GUSTAR
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => {
          const image = product.images[0]
          return (
            <Link key={product.id} href={`/productos/${product.slug}`}>
              <ProductCard
                id={product.id}
                name={product.name}
                brand={product.brand ?? ""}
                price={product.basePrice}
                salePrice={product.isOnSale && product.salePrice ? product.salePrice : undefined}
                imageUrl={image?.url}
                isOnSale={product.isOnSale}
              />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
