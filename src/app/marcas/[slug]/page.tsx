import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import ProductFaqSection from "@/components/product/ProductFaqSection"
import { getBrandDetailBySlug } from "@/server/services/brand.service"
import { getCatalogPriceBounds } from "@/server/services/product.service"
import { getFeaturedReviewsForBrand } from "@/server/services/review.service"
import { getPublicSiteContent } from "@/server/services/site-content.service"
import { getPublicStoreInfo } from "@/server/services/store-settings.service"
import { getUniqueSizes, getUniqueColors } from "@/server/services/variant.service"
import { getColorPalette } from "@/server/services/product-color.service"
import { buildBrandJsonLd, buildBrandMetadata } from "@/lib/seo/brand-seo"
import { serializeJsonLd } from "@/lib/seo/product-seo"
import { resolveProductContent } from "@/lib/product-content-resolver"
import { splitHighlight } from "@/lib/product-faq"
import { getSiteUrl } from "@/lib/site-url"
import { resolveBrandLogoUrl } from "@/lib/brand-logos"
import type { ProductSortValue } from "@/lib/product-sort"

interface BrandPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    q?: string
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

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params
  const [brand, settings] = await Promise.all([
    getBrandDetailBySlug(slug),
    getPublicStoreInfo().catch(() => null),
  ])

  if (!brand || !brand.isActive) {
    return { title: "Marca no encontrada | One Star", robots: { index: false, follow: false } }
  }

  return buildBrandMetadata(brand, {
    siteUrl: getSiteUrl(),
    storeName: settings?.storeName ?? "One Star",
  })
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-500 text-sm" aria-label={`${rating} de 5 estrellas`}>
      {"★".repeat(rating)}
      <span className="text-gray-300">{"★".repeat(5 - rating)}</span>
    </span>
  )
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const brand = await getBrandDetailBySlug(slug)
  if (!brand || !brand.isActive) notFound()

  const [sizes, colors, colorPalette, featuredReviews, globalContent, settings, priceBounds] = await Promise.all([
    getUniqueSizes(),
    getUniqueColors(),
    getColorPalette(),
    getFeaturedReviewsForBrand(brand.id, 6),
    getPublicSiteContent(),
    getPublicStoreInfo().catch(() => null),
    getCatalogPriceBounds(),
  ])

  const resolved = resolveProductContent({
    brand: { highlights: brand.highlights, faqs: brand.faqs },
    global: globalContent,
    hasWhatsapp: Boolean(settings?.whatsapp),
  })

  const jsonLd = buildBrandJsonLd(brand, {
    siteUrl: getSiteUrl(),
    storeName: settings?.storeName ?? "One Star",
  })

  const currentParams = new URLSearchParams(
    Object.entries(resolvedSearchParams).filter(([, v]) => v !== undefined) as [string, string][]
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* Hero de Marca */}
      <div className="relative border-b border-[#E0E0E0] bg-[#F9F9F9] dark:border-white/10 dark:bg-white/5">
        {brand.bannerUrl && (
          <div className="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden bg-[#1C1C1C]">
            <Image
              src={brand.bannerUrl}
              alt={`Banner ${brand.name}`}
              fill
              priority
              className="object-cover opacity-75"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="font-montserrat text-xs text-[#4A4A4A] dark:text-gray-400 mb-6 flex gap-2 items-center">
            <Link href="/" className="hover:text-[#1C1C1C] dark:hover:text-white transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/marcas" className="hover:text-[#1C1C1C] dark:hover:text-white transition-colors">Marcas</Link>
            <span>/</span>
            <span className="text-[#1C1C1C] dark:text-white font-medium">{brand.name}</span>
          </nav>

          {(() => {
            const logoUrl = resolveBrandLogoUrl(brand)
            return (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {logoUrl && (
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#1C1C1C]">
                    <Image
                      src={logoUrl}
                      alt={`Logo ${brand.name}`}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                )}
                <div>
                  <h1 className="font-barlow text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-[#1C1C1C] dark:text-white">
                    {brand.name}
                  </h1>
                  {brand.description && (
                    <p className="mt-2 max-w-3xl font-montserrat text-sm sm:text-base text-[#4A4A4A] dark:text-gray-300 leading-relaxed">
                      {brand.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Historia de la marca (texto plano seguro, no HTML) */}
          {brand.story && (
            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-white/5 border border-gray-100 dark:border-white/10 max-w-4xl">
              <h2 className="font-barlow text-lg font-bold uppercase text-[#1C1C1C] dark:text-white mb-2">
                Historia y Filosofía de {brand.name}
              </h2>
              <p className="font-montserrat text-sm text-[#4A4A4A] dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {brand.story}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Beneficios de la Marca y Promesas */}
      {resolved.highlights.length > 0 && (
        <div className="bg-white dark:bg-[#121212] border-b border-[#E0E0E0] dark:border-white/10 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-barlow text-xl font-bold uppercase text-[#1C1C1C] dark:text-white mb-4">
              ¿Por qué elegir {brand.name}?
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {resolved.highlights.map((h, i) => {
                const { title, detail } = splitHighlight(h)
                return (
                  <div key={i} className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="font-montserrat text-sm font-bold text-[#1C1C1C] dark:text-white">
                      ✓ {title}
                    </p>
                    {detail && (
                      <p className="mt-1 font-montserrat text-xs text-[#4A4A4A] dark:text-gray-400 leading-relaxed">
                        {detail}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Catálogo con Filtros y Grid */}
      <ShopLayout
        sidebar={
          <FilterSidebar
          key={currentParams.toString()}
            brands={[]}
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
          brandId={brand.id}
          title={`Catálogo ${brand.name}`}
          subtitle={`Explora todos los modelos disponibles de ${brand.name}`}
          colorPalette={colorPalette}
          titleHeadingLevel="h2"
        />
      </ShopLayout>

      {/* Reseñas Destacadas de la Marca */}
      {featuredReviews.length > 0 && (
        <section className="border-t border-[#E0E0E0] bg-[#F9F9F9] py-14 dark:border-white/10 dark:bg-white/5" aria-labelledby="testimonios-marca">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
              <div>
                <h2 id="testimonios-marca" className="font-barlow text-2xl sm:text-3xl font-black uppercase text-[#1C1C1C] dark:text-white">
                  Opiniones sobre {brand.name}
                </h2>
                <div className="mt-2 h-1 w-12 bg-[#E31C23]" />
              </div>
              <p className="mt-2 sm:mt-0 text-xs text-[#4A4A4A] dark:text-gray-400 font-montserrat">
                Testimonios verificados de clientes
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredReviews.map((rev) => (
                <div key={rev.id} className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1C1C1C]">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Stars rating={rev.rating} />
                      {rev.verified && (
                        <span className="text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full dark:bg-green-950/40 dark:text-green-400">
                          ✓ Compra verificada
                        </span>
                      )}
                    </div>
                    {rev.title && (
                      <h3 className="font-montserrat text-sm font-bold text-[#1C1C1C] dark:text-white mb-1">
                        {rev.title}
                      </h3>
                    )}
                    <p className="font-montserrat text-sm text-[#4A4A4A] dark:text-gray-300 leading-relaxed italic">
                      &ldquo;{rev.body}&rdquo;
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1C1C1C] dark:text-white">{rev.userName}</span>
                    <Link
                      href={`/productos/${rev.product.slug}`}
                      className="text-blue-600 hover:underline truncate max-w-[140px] dark:text-blue-400"
                    >
                      {rev.product.name}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Preguntas Frecuentes de la Marca */}
      {resolved.faqs.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <ProductFaqSection faqs={resolved.faqs} />
        </div>
      )}
    </>
  )
}
