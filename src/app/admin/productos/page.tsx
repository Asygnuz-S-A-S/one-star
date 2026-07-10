import Link from "next/link"
import { getProducts } from "@/server/services/product.service"
import { getCategories } from "@/server/services/category.service"
import { ProductosTable } from "@/components/admin/ProductosTable"

const PAGE_SIZE = 20

interface SearchParams {
  page?: string
  q?: string
  category?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function ProductosPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1") || 1)
  const q = params.q?.trim() ?? ""
  const categoryFilter = params.category ?? ""

  const [{ products, total }, categories] = await Promise.all([
    getProducts(
      {
        q: q || undefined,
        ...(categoryFilter ? { categorySlug: undefined } : {}),
        page: String(page),
      },
      PAGE_SIZE
    ),
    getCategories(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function buildPageUrl(p: number) {
    const qs = new URLSearchParams()
    if (q) qs.set("q", q)
    if (categoryFilter) qs.set("category", categoryFilter)
    if (p > 1) qs.set("page", String(p))
    const s = qs.toString()
    return `/admin/productos${s ? `?${s}` : ""}`
  }

  const prevHref = page > 1 ? buildPageUrl(page - 1) : undefined
  const nextHref = page < totalPages ? buildPageUrl(page + 1) : undefined

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">
          Productos
          <span className="ml-2 text-sm font-normal text-[#4A4A4A]">({total})</span>
        </h1>
        <Link
          href="/admin/integraciones"
          className="bg-[#E31C23] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Sincronizar ERP
        </Link>
      </div>

      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o marca…"
          className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        />
        <select
          name="category"
          defaultValue={categoryFilter}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-[#1C1C1C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#4A4A4A] transition-colors"
        >
          Filtrar
        </button>
        {(q || categoryFilter) && (
          <Link
            href="/admin/productos"
            className="text-sm text-[#4A4A4A] px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            Limpiar
          </Link>
        )}
      </form>

      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-[#4A4A4A] text-lg mb-4">
            {q || categoryFilter
              ? "No se encontraron productos con esos filtros."
              : "Aún no hay productos."}
          </p>
          <Link
            href="/admin/integraciones"
            className="inline-block bg-[#E31C23] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Sincronizar desde Loggro
          </Link>
        </div>
      ) : (
        <ProductosTable
          products={products}
          total={total}
          page={page}
          totalPages={totalPages}
          prevHref={prevHref}
          nextHref={nextHref}
        />
      )}
    </div>
  )
}
