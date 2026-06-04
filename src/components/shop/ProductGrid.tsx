import Link from "next/link"
import ProductCard from "@/components/home/ProductCard"
import SortBar from "@/components/shop/SortBar"
import { getProducts } from "@/server/services/product.service"

const PAGE_SIZE = 24

type SearchParams = {
  q?: string
  marca?: string
  talla?: string
  color?: string
  precio_min?: string
  precio_max?: string
  orden?: "precio_asc" | "precio_desc" | "reciente" | "antiguo"
  page?: string
  genero?: string
}

interface ProductGridProps {
  searchParams: SearchParams
  categorySlug?: string
  genderFilter?: string
  extraGenders?: string[] // para ninos: NINO, NINA, INFANTIL, BEBE
  title: string
  subtitle?: string
  isOnSaleOnly?: boolean
  headerClassName?: string
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
  genderFilter,
  extraGenders,
  title,
  subtitle,
  isOnSaleOnly,
  headerClassName,
}: ProductGridProps) {
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const skip = (page - 1) * PAGE_SIZE

  const filterParams = {
    ...searchParams,
    categorySlug,
    genderFilter,
    extraGenders,
    isOnSaleOnly,
  }

  const { products, total } = await getProducts(filterParams, PAGE_SIZE)

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const activeFilters = getActiveFilters(searchParams)

  // Build current search string for param manipulation
  const currentSearch = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v !== undefined) as [string, string][]
  ).toString()

  return (
    <div>
      {/* Section header */}
      <div className={`px-4 md:px-8 py-8 ${headerClassName ?? ""}`}>
        <h1 className="font-[var(--font-barlow)] font-bold text-3xl md:text-5xl uppercase tracking-tight text-[#1C1C1C]">
          {title}
        </h1>
        {subtitle && (
          <p className="font-[var(--font-montserrat)] text-[#4A4A4A] mt-1 text-sm">
            {subtitle}
          </p>
        )}
      </div>

      {/* Sort bar (client) */}
      <SortBar
        total={total}
        currentParams={new URLSearchParams(currentSearch)}
      />

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 md:px-8 py-4">
          {activeFilters.map((f) => (
            <Link
              key={f.key}
              href={removeParamUrl(currentSearch, f.key)}
              className="inline-flex items-center gap-1.5 bg-[#1C1C1C] text-white font-[var(--font-montserrat)] text-xs px-3 py-1.5 hover:bg-[#4A4A4A] transition-colors"
            >
              {f.label}
              <span className="text-sm leading-none">×</span>
            </Link>
          ))}
          <Link
            href="?"
            className="inline-flex items-center gap-1.5 border border-[#E0E0E0] text-[#4A4A4A] font-[var(--font-montserrat)] text-xs px-3 py-1.5 hover:border-[#1C1C1C] hover:text-[#1C1C1C] transition-colors"
          >
            Limpiar todo
          </Link>
        </div>
      )}

      {/* Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <p className="font-[var(--font-barlow)] font-bold text-xl text-[#1C1C1C] mb-2">
            Sin resultados
          </p>
          <p className="font-[var(--font-montserrat)] text-[#4A4A4A] text-sm mb-6">
            No encontramos productos con estos filtros.
          </p>
          <Link
            href="/productos"
            className="bg-[#1C1C1C] text-white font-[var(--font-barlow)] font-bold uppercase text-xs tracking-widest px-6 py-3 hover:bg-[#4A4A4A] transition-colors"
          >
            Ver todos los productos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4 md:px-8 py-6">
          {products.map((product) => {
            const image = product.images[0]
            return (
              <Link key={product.id} href={`/producto/${product.slug}`}>
                <ProductCard
                  id={product.id}
                  name={product.name}
                  brand={product.brand ?? "One Star"} // TODO: brand is optional in schema
                  price={product.basePrice}
                  salePrice={product.salePrice ?? undefined}
                  imageUrl={image?.url}
                  isOnSale={product.isOnSale}
                />
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 px-4 py-10">
          {page > 1 ? (
            <Link
              href={`?${buildPaginationParams(currentSearch, page - 1)}`}
              className="font-[var(--font-barlow)] font-bold uppercase text-xs tracking-widest border border-[#1C1C1C] px-6 py-3 hover:bg-[#1C1C1C] hover:text-white transition-colors"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="font-[var(--font-barlow)] font-bold uppercase text-xs tracking-widest border border-[#E0E0E0] px-6 py-3 text-[#E0E0E0] cursor-not-allowed">
              ← Anterior
            </span>
          )}

          <span className="font-[var(--font-montserrat)] text-sm text-[#4A4A4A]">
            {page} / {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`?${buildPaginationParams(currentSearch, page + 1)}`}
              className="font-[var(--font-barlow)] font-bold uppercase text-xs tracking-widest border border-[#1C1C1C] px-6 py-3 hover:bg-[#1C1C1C] hover:text-white transition-colors"
            >
              Siguiente →
            </Link>
          ) : (
            <span className="font-[var(--font-barlow)] font-bold uppercase text-xs tracking-widest border border-[#E0E0E0] px-6 py-3 text-[#E0E0E0] cursor-not-allowed">
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
