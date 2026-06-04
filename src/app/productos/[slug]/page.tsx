import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getProductBySlug } from "@/server/services/product.service"
import ProductGallery from "@/components/product/ProductGallery"
import ProductInfo from "@/components/product/ProductInfo"
import CrossSelling from "@/components/product/CrossSelling"
import RelatedProducts from "@/components/product/RelatedProducts"

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug)

  if (!product) {
    return {
      title: "Producto no encontrado | One Star",
    }
  }

  return {
    title: product.metaTitle ?? `${product.name} | One Star`,
    description: product.metaDescription ?? product.description ?? undefined,
    openGraph: {
      title: product.metaTitle ?? `${product.name} | One Star`,
      description: product.metaDescription ?? product.description ?? undefined,
      images: product.images[0]?.url ? [{ url: product.images[0].url }] : [],
    },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const product = await getProductBySlug(params.slug)

  if (!product) {
    notFound()
  }

  const displayPrice = product.isOnSale && product.salePrice
    ? Number(product.salePrice)
    : Number(product.basePrice)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images.map((img) => img.url),
    brand: {
      "@type": "Brand",
      name: product.brand ?? "One Star",
    },
    offers: {
      "@type": "Offer",
      price: displayPrice.toFixed(0),
      priceCurrency: "COP",
      availability: "https://schema.org/InStock",
      url: `https://onestar.com.co/productos/${product.slug}`,
    },
  }

  return (
    <>
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="font-[var(--font-montserrat)] text-xs text-[#4A4A4A] mb-6 flex gap-2 items-center">
          <a href="/" className="hover:text-[#1C1C1C] transition-colors">Inicio</a>
          <span>/</span>
          <a href="/productos" className="hover:text-[#1C1C1C] transition-colors">Productos</a>
          {product.category && (
            <>
              <span>/</span>
              <a
                href={`/categoria/${product.category.slug}`}
                className="hover:text-[#1C1C1C] transition-colors"
              >
                {product.category.name}
              </a>
            </>
          )}
          <span>/</span>
          <span className="text-[#1C1C1C] font-medium truncate max-w-[140px]">{product.name}</span>
        </nav>

        {/* Main product layout */}
        <div className="grid grid-cols-1 md:grid-cols-[60%_40%] gap-8 md:gap-12">
          {/* Gallery — left on desktop, top on mobile */}
          <div>
            <ProductGallery images={product.images} videoUrl={product.videoUrl} />
          </div>

          {/* Info — right on desktop, bottom on mobile */}
          <div>
            <ProductInfo product={product} />
          </div>
        </div>

        {/* Cross-selling */}
        {product.crossSells.length > 0 && (
          <div className="mt-12 border-t border-[#E0E0E0] pt-4">
            <CrossSelling products={product.crossSells} />
          </div>
        )}

        {/* Related products from same category */}
        <RelatedProducts categoryId={product.categoryId} excludeSlug={product.slug} />
      </div>
    </>
  )
}
