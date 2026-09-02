import Link from "next/link"
import { getAdminProducts } from "@/server/services/product.service"
import { getAllBrands } from "@/server/services/brand.service"
import { getCategories } from "@/server/services/category.service"
import { parseAdminProductFilters } from "@/server/validators/product.validator"
import { ProductosTable } from "@/components/admin/ProductosTable"

const PAGE_SIZE = 20

type SearchParams = Record<string, string | string[] | undefined>

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function ProductosPage({ searchParams }: Props) {
  const params = await searchParams
  const {
    page,
    q,
    categoryId,
    brandId,
    status,
    hasStock,
  } = parseAdminProductFilters({
    ...params,
    brand: params.marca,
  })

  const [{ products, total }, categories, brands] = await Promise.all([
    getAdminProducts(
      {
        q: q || undefined,
        categoryId,
        brandId,
        status,
        hasStock,
        page: String(page),
      },
      PAGE_SIZE
    ),
    getCategories(),
    getAllBrands(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function buildPageUrl(p: number) {
    const qs = new URLSearchParams()
    if (q) qs.set("q", q)
    if (categoryId) qs.set("category", categoryId)
    if (status) qs.set("status", status)
    if (hasStock) qs.set("hasStock", hasStock)
    if (brandId) qs.set("marca", brandId)
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
          placeholder="Buscar por nombre…"
          className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        />
        <select
          name="category"
          defaultValue={categoryId ?? ""}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <select
          name="hasStock"
          defaultValue={hasStock ?? ""}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        >
          <option value="">Todo el inventario</option>
          <option value="yes">Con stock</option>
          <option value="no">Agotados</option>
        </select>
        <select
          name="marca"
          defaultValue={brandId ?? ""}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        >
          <option value="">Todas las marcas</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-[#1C1C1C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#4A4A4A] transition-colors"
        >
          Filtrar
        </button>
        {(q || categoryId || status || hasStock || brandId) && (
          <Link
            href="/admin/productos"
            className="text-sm text-[#4A4A4A] px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            Limpiar
          </Link>
        )}
      </form>

      <ProductosTable
        products={products}
        total={total}
        page={page}
        totalPages={totalPages}
        prevHref={prevHref}
        nextHref={nextHref}
        emptyMessage={
          q || categoryId || status || hasStock || brandId
            ? "No se encontraron productos con esos filtros."
            : "Aún no hay productos."
        }
      />
    </div>
  )
}
