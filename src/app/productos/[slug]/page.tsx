import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { getProductBySlug, type InventoryStoreDTO } from "@/server/services/product.service"
import { getProductReviews, getProductReviewStats } from "@/server/services/review.service"
import ProductDetail from "@/components/product/ProductDetail"
import MetaViewContent from "@/components/tracking/MetaViewContent"
import CrossSelling from "@/components/product/CrossSelling"
import RelatedProducts from "@/components/product/RelatedProducts"
import ProductReviews from "@/components/product/ProductReviews"
import StoreAvailability from "@/components/product/StoreAvailability"
import Reveal from "@/components/ui/Reveal"

interface PageProps {
  params: Promise<{ slug: string }>
  /** `?color=` llega desde las miniaturas del catálogo para abrir ese color. */
  searchParams?: Promise<{ color?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    return { title: "Producto no encontrado | One Star" }
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

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { color: initialColor } = (await searchParams) ?? {}
  const product = await getProductBySlug(slug)

  if (!product) notFound()

  const [productReviews, productReviewStats] = await Promise.all([
    getProductReviews(product.id),
    getProductReviewStats(product.id),
  ])


  const displayPrice = product.isOnSale && product.salePrice
    ? Number(product.salePrice)
    : Number(product.basePrice)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images.map((img) => img.url),
    brand: { "@type": "Brand", name: product.brand ?? "One Star" },
    aggregateRating: productReviewStats.count > 0 ? {
      "@type": "AggregateRating",
      ratingValue: productReviewStats.avg.toFixed(1),
      reviewCount: productReviewStats.count,
    } : undefined,
    offers: {
      "@type": "Offer",
      price: displayPrice.toFixed(0),
      priceCurrency: "COP",
      availability: "https://schema.org/InStock",
      url: `https://onestar.com.co/productos/${product.slug}`,
    },
  }

  // Disponibilidad online = stock vendible por variante (lo mismo que valida el
  // checkout). El desglose por sede es solo informativo: la web no lo reserva.
  const storeMap = new Map<string, { store: InventoryStoreDTO; stock: number }>()
  const webStock = product.variants.reduce((total, variant) => total + variant.stock, 0)
  for (const variant of product.variants) {
    for (const inv of variant.inventory ?? []) {
      if (!inv.storeLocation || inv.storeLocation.isWebWarehouse) continue
      if (inv.storeLocation.isActive) {
        const existing = storeMap.get(inv.storeLocation.id)
        if (existing) {
          existing.stock += inv.stock
        } else {
          storeMap.set(inv.storeLocation.id, { store: inv.storeLocation, stock: inv.stock })
        }
      }
    }
  }
  const physicalStores = Array.from(storeMap.values()).map(({ store, stock }) => ({
    id: store.id,
    name: store.name,
    address: store.address,
    city: store.city,
    phone: store.phone,
    schedule: store.schedule,
    googleMapsUrl: store.googleMapsUrl,
    latitude: store.latitude,
    longitude: store.longitude,
    stock,
  }))

  return (
    <>
      {/*
        JSON-LD for SEO. Sin `nonce`: el navegador vacía ese atributo tras
        parsear el HTML, así que React veía "" en el DOM contra el valor del
        payload y reportaba un error de hidratación. Un bloque de datos
        `application/ld+json` no se ejecuta, por lo que `script-src` de la CSP
        no lo bloquea y el nonce era innecesario.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="font-[var(--font-montserrat)] text-xs text-[#4A4A4A] dark:text-gray-400 mb-6 flex gap-2 items-center">
          <Link href="/" className="hover:text-[#1C1C1C] dark:hover:text-white transition-colors">Inicio</Link>
          <span>/</span>
          <Link href="/productos" className="hover:text-[#1C1C1C] dark:hover:text-white transition-colors">Productos</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link
                href={`/productos?categoria=${product.category.slug}`}
                className="hover:text-[#1C1C1C] dark:hover:text-white transition-colors"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-[#1C1C1C] dark:text-white font-medium truncate max-w-[140px]">{product.name}</span>
        </nav>

        {/* ── Main product grid ── */}
        <MetaViewContent
          productId={product.id}
          name={product.name}
          category={product.category?.name ?? ""}
          price={displayPrice}
        />
        <ProductDetail
          product={product}
          reviewStats={productReviewStats}
          initialColor={initialColor}
        />

        {/* ── Extended description hero (Nike-style) ── */}
        {(product.extendedDescription || product.description) && (
          <Reveal from="scale" className="relative bg-[#F5F5F5] dark:bg-white/5 rounded-3xl overflow-hidden mb-16 min-h-[280px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-10 md:p-16">
              <div>
                <h2 className="font-[var(--font-barlow)] font-black text-3xl md:text-4xl uppercase text-[#1C1C1C] dark:text-white mb-2 leading-tight">
                  {product.name}
                </h2>
                {product.brand && (
                  <p className="font-[var(--font-montserrat)] text-xs uppercase tracking-widest text-[#4A4A4A] dark:text-gray-400 mb-6">
                    {product.brand}
                  </p>
                )}
                <p className="font-[var(--font-montserrat)] text-sm text-[#4A4A4A] dark:text-gray-300 leading-relaxed">
                  {product.extendedDescription ?? product.description}
                </p>
              </div>
              {product.images[1] && (
                <div className="relative h-64 md:h-80">
                  <Image
                    src={product.images[1].url}
                    alt={product.images[1].alt || product.name}
                    fill
                    className="object-contain object-right-bottom drop-shadow-2xl"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              )}
            </div>
          </Reveal>
        )}
      </div>

      {/* ── Reviews Section ── */}
      <ProductReviews
        productId={product.id}
        initialReviews={productReviews}
        stats={productReviewStats}
      />

      {/* ── Store Availability ── */}
      <StoreAvailability
        availableOnline={product.availableOnline ?? true}
        availableInStores={product.availableInStores ?? true}
        stores={physicalStores}
        webStock={webStock}
      />

      {/* ── Cross-selling ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(product.crossSells?.length ?? 0) > 0 && (
          <div className="mt-8 border-t border-[#E0E0E0] dark:border-white/10 pt-12">
            <CrossSelling products={product.crossSells} />
          </div>
        )}

        {/* ── Related products ── */}
        <RelatedProducts categoryId={product.categoryId} excludeSlug={product.slug} />
      </div>
    </>
  )
}
