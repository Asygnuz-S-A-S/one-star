import { cache } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { getProductBySlug, type InventoryStoreDTO } from "@/server/services/product.service"
import { getPublicStoreInfo } from "@/server/services/store-settings.service"
import { getPublicSiteContent } from "@/server/services/site-content.service"
import { getBrandDetailById } from "@/server/services/brand.service"
import { getProductReviews, getProductReviewStats } from "@/server/services/review.service"
import ProductDetail from "@/components/product/ProductDetail"
import MetaViewContent from "@/components/tracking/MetaViewContent"
import CrossSelling from "@/components/product/CrossSelling"
import RelatedProducts from "@/components/product/RelatedProducts"
import ProductReviews from "@/components/product/ProductReviews"
import StoreAvailability from "@/components/product/StoreAvailability"
import WhyBuy from "@/components/product/WhyBuy"
import ProductFaqSection from "@/components/product/ProductFaqSection"
import ClosingCta from "@/components/product/ClosingCta"
import { buildProductJsonLd, buildProductMetadata, getDisplayPrice, serializeJsonLd } from "@/lib/seo/product-seo"
import { resolveProductContent } from "@/lib/product-content-resolver"
import { buildWhatsappUrl } from "@/lib/whatsapp"
import { getSiteUrl } from "@/lib/site-url"
import Reveal from "@/components/ui/Reveal"

interface PageProps {
  params: Promise<{ slug: string }>
  /** `?color=` llega desde las miniaturas del catálogo para abrir ese color. */
  searchParams?: Promise<{ color?: string }>
}

/** Una sola consulta por petición: la comparten `generateMetadata` y la página. */
const loadProduct = cache(getProductBySlug)

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await loadProduct(slug)

  if (!product) {
    return { title: "Producto no encontrado | One Star", robots: { index: false, follow: false } }
  }

  // Consulta secuencial: primero producto, luego dependencias en paralelo
  const [brandDetail, globalContent, settings] = await Promise.all([
    product.brandId ? getBrandDetailById(product.brandId) : null,
    getPublicSiteContent(),
    getPublicStoreInfo().catch(() => null),
  ])

  const resolved = resolveProductContent({
    product: { highlights: product.highlights, faqs: product.faqs },
    brand: brandDetail,
    global: globalContent,
    hasWhatsapp: Boolean(settings?.whatsapp),
  })

  return buildProductMetadata(
    { ...product, faqs: resolved.faqs },
    {
      siteUrl: getSiteUrl(),
      storeName: settings?.storeName ?? "One Star",
      reviews: [],
      reviewStats: { avg: 0, count: 0 },
      returnWindowDays: resolved.returnWindowDays,
    }
  )
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { color: initialColor } = (await searchParams) ?? {}
  const product = await loadProduct(slug)

  if (!product) notFound()

  // Consulta secuencial: primero producto, luego dependencias en paralelo
  const [brandDetail, globalContent, productReviews, productReviewStats, settings] = await Promise.all([
    product.brandId ? getBrandDetailById(product.brandId) : null,
    getPublicSiteContent(),
    getProductReviews(product.id),
    getProductReviewStats(product.id),
    getPublicStoreInfo().catch(() => null),
  ])

  const hasWhatsapp = Boolean(settings?.whatsapp)
  const resolvedContent = resolveProductContent({
    product: { highlights: product.highlights, faqs: product.faqs },
    brand: brandDetail,
    global: globalContent,
    hasWhatsapp,
  })

  const displayPrice = getDisplayPrice(product)
  const whatsappUrl = buildWhatsappUrl(
    settings?.whatsapp,
    `Hola, quiero comprar ${product.name} (${getSiteUrl()}/productos/${product.slug}) y tengo una duda.`
  )

  const jsonLd = buildProductJsonLd(
    { ...product, faqs: resolvedContent.faqs },
    {
      siteUrl: getSiteUrl(),
      storeName: settings?.storeName ?? "One Star",
      reviews: productReviews,
      reviewStats: productReviewStats,
      returnWindowDays: resolvedContent.returnWindowDays,
    }
  )

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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
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
          promises={resolvedContent.promises}
          whatsappUrl={whatsappUrl}
          initialColor={initialColor}
        />

        {/* ── Por qué comprarlo ── */}
        <WhyBuy productName={product.name} highlights={resolvedContent.highlights} promises={resolvedContent.promises} />

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

      {/* ── FAQ + cierre ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <ProductFaqSection faqs={resolvedContent.faqs} />
        {product.availableOnline !== false && (
          <ClosingCta name={product.name} price={displayPrice} targetId="comprar" />
        )}
      </div>

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
