import Link from "next/link"
import SortBar from "@/components/shop/SortBar"
import { getProducts } from "@/server/services/product.service"
import { getCatalogRules } from "@/server/services/store-settings.service"
import { AnimatedProductGrid } from "@/components/shop/AnimatedProductGrid"
import type { ColorPalette } from "@/lib/colors"
import { getGenderFilterLabel } from "@/lib/gender-filter"
import type { ProductSortValue } from "@/lib/product-sort"

const PAGE_SIZE = 24

type SearchParams = {
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
}

interface ProductGridProps {
  searchParams: SearchParams
  categorySlug?: string
  /** Filtra por id de marca (rutas /marcas/[slug]); tiene prioridad sobre ?marca=. */
  brandId?: string
  genderFilter?: string
  extraGenders?: string[] // para ninos: NINO, NINA, INFANTIL, BEBE
  title: string
  subtitle?: string
  /** Texto pequeño sobre el título (ej. "Ofertas One Star"). */
  eyebrow?: string
  isOnSaleOnly?: boolean
  /** Limita el listado a productos creados dentro de la ventana de lanzamientos. */
  newArrivals?: boolean
  headerClassName?: string
  colorPalette?: ColorPalette
  titleHeadingLevel?: "h1" | "h2"
}

// where and order builders removed (now handled in product.service)

function removeParamUrl(currentSearch: string, key: string): string {
  const params = new URLSearchParams(currentSearch)
  params.delete(key)
  params.delete("page")
  const qs = params.toString()
  return qs ? `?${qs}` : "?"
}

interface ActiveFilter {
  key: string
  label: string
  value: string
}

function getActiveFilters(searchParams: SearchParams): ActiveFilter[] {
  const filters: ActiveFilter[] = []
  if (searchParams.q) filters.push({ key: "q", label: `Búsqueda: "${searchParams.q}"`, value: searchParams.q })
  if (searchParams.marca) filters.push({ key: "marca", label: `Marca: ${searchParams.marca}`, value: searchParams.marca })
  const generoLabel = getGenderFilterLabel(searchParams.genero)
  if (searchParams.genero && generoLabel) filters.push({ key: "genero", label: `Género: ${generoLabel}`, value: searchParams.genero })
  if (searchParams.talla) filters.push({ key: "talla", label: `Talla: ${searchParams.talla}`, value: searchParams.talla })
  if (searchParams.color) filters.push({ key: "color", label: `Color: ${searchParams.color}`, value: searchParams.color })
  if (searchParams.precio_min || searchParams.precio_max) {
    filters.push({
      key: "precio_min",
      label: `Precio: $${searchParams.precio_min ?? "0"} - $${searchParams.precio_max ?? "∞"}`,
      value: searchParams.precio_min ?? "",
    })
  }
  return filters
}

export default async function ProductGrid({
  searchParams,
  categorySlug,
  brandId,
  genderFilter,
  extraGenders,
  title,
  subtitle,
  eyebrow,
  isOnSaleOnly,
  newArrivals,
  headerClassName,
  colorPalette,
  titleHeadingLevel = "h1",
}: ProductGridProps) {
  const page = Math.max(1, Number(searchParams.page ?? 1))

  const catalogRules = await getCatalogRules().catch(() => ({ hideImagelessProducts: true, newArrivalDays: 30, groupColorsInCatalog: true }))
  const filterParams = {
    ...searchParams,
    // La prop categorySlug (rutas /hombre, etc.) tiene prioridad; si no,
    // se admite el query param ?categoria= usado por el breadcrumb de la ficha.
    categorySlug: categorySlug ?? searchParams.categoria,
    brandId,
    genderFilter,
    extraGenders,
    isOnSaleOnly,
    requireImage: catalogRules.hideImagelessProducts,
    createdWithinDays: newArrivals ? catalogRules.newArrivalDays : undefined,
    groupColors: catalogRules.groupColorsInCatalog,
  }

  const { products, total } = await getProducts(filterParams, PAGE_SIZE)

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const activeFilters = getActiveFilters(searchParams)

  // Build current search string for param manipulation
  const currentSearch = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v !== undefined) as [string, string][]
  ).toString()

  const TitleTag = titleHeadingLevel

  return (
    <div>
      {/* Section header */}
      <div className={`relative overflow-hidden px-4 py-8 md:px-8 md:py-10 ${headerClassName ?? ""}`}>
        {eyebrow && <p className="store-eyebrow mb-2">{eyebrow}</p>}
        <TitleTag className="font-barlow text-4xl font-extrabold uppercase leading-none tracking-[-0.03em] text-[#1C1C1C] md:text-6xl dark:text-white">
          {title}
        </TitleTag>
        <span aria-hidden="true" className="mt-3 block h-1 w-12 bg-[#E31C23]" />
        {subtitle && (
          <p className="mt-3 max-w-xl font-montserrat text-sm text-[#4A4A4A] md:text-base dark:text-white/50">
            {subtitle}
          </p>
        )}
      </div>

      {/* Sort bar (client) */}
      <SortBar
        total={total}
        currentParams={currentSearch}
      />

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 md:px-8 py-4">
          {activeFilters.map((f) => (
            <Link
              key={f.key}
              href={removeParamUrl(currentSearch, f.key)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#1C1C1C] px-3.5 font-montserrat text-xs text-white transition-colors hover:bg-[#4A4A4A]"
            >
              {f.label}
              <span className="text-sm leading-none">×</span>
            </Link>
          ))}
          <Link
            href="?"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#E0E0E0] px-3.5 font-montserrat text-xs text-[#4A4A4A] transition-colors hover:border-[#1C1C1C] hover:text-[#1C1C1C] dark:border-white/15 dark:text-white/50 dark:hover:border-white/40 dark:hover:text-white/80"
          >
            Limpiar todo
          </Link>
        </div>
      )}

      {/* Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <p className="font-barlow font-bold text-xl text-[#1C1C1C] dark:text-white mb-2">
            Sin resultados
          </p>
          <p className="font-montserrat text-[#4A4A4A] dark:text-white/50 text-sm mb-6">
            No encontramos productos con estos filtros.
          </p>
          <Link
            href="/productos"
            className="inline-flex min-h-11 items-center bg-[#1C1C1C] px-6 font-barlow text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#4A4A4A]"
          >
            Ver todos los productos
          </Link>
        </div>
      ) : (
        <AnimatedProductGrid
          products={products}
          animationKey={currentSearch}
          colorPalette={colorPalette}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 px-4 py-10">
          {page > 1 ? (
            <Link
              href={`?${buildPaginationParams(currentSearch, page - 1)}`}
              className="inline-flex min-h-11 items-center border border-[#1C1C1C] px-6 font-barlow text-xs font-bold uppercase tracking-widest transition-colors hover:bg-[#1C1C1C] hover:text-white dark:border-white/30 dark:text-white/70 dark:hover:bg-white dark:hover:text-black"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="font-barlow font-bold uppercase text-xs tracking-widest border border-[#E0E0E0] dark:border-white/10 px-6 py-3 text-[#E0E0E0] dark:text-white/15 cursor-not-allowed">
              ← Anterior
            </span>
          )}

          <span className="font-montserrat text-sm text-[#4A4A4A] dark:text-white/40">
            {page} / {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`?${buildPaginationParams(currentSearch, page + 1)}`}
              className="inline-flex min-h-11 items-center border border-[#1C1C1C] px-6 font-barlow text-xs font-bold uppercase tracking-widest transition-colors hover:bg-[#1C1C1C] hover:text-white dark:border-white/30 dark:text-white/70 dark:hover:bg-white dark:hover:text-black"
            >
              Siguiente →
            </Link>
          ) : (
            <span className="font-barlow font-bold uppercase text-xs tracking-widest border border-[#E0E0E0] dark:border-white/10 px-6 py-3 text-[#E0E0E0] dark:text-white/15 cursor-not-allowed">
              Siguiente →
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function buildPaginationParams(currentSearch: string, newPage: number): string {
  const params = new URLSearchParams(currentSearch)
  params.set("page", String(newPage))
  return params.toString()
}
