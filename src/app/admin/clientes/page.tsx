import { getCustomers } from "@/server/services/user.service"
import Link from "next/link"
import { ClientesTable } from "@/components/admin/ClientesTable"

const PAGE_SIZE = 25
const BRANDS = ["Nike", "New Balance", "Hoka", "Veja", "On", "Adidas", "Asics"]

interface SearchParams {
  q?: string
  brand?: string
  page?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function ClientesPage({ searchParams }: Props) {
  const params = await searchParams
  const q = params.q?.trim() ?? ""
  const brand = params.brand ?? ""
  const page = Math.max(1, parseInt(params.page ?? "1") || 1)

  const { customers, total } = await getCustomers({ q, page, pageSize: PAGE_SIZE })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {}
    if (q) base.q = q
    if (brand) base.brand = brand
    if (page > 1) base.page = String(page)
    const merged = { ...base, ...overrides }
    const qs = new URLSearchParams(
      Object.entries(merged).filter(([, v]) => v !== undefined) as [string, string][]
    ).toString()
    return `/admin/clientes${qs ? `?${qs}` : ""}`
  }

  const prevHref = page > 1 ? buildUrl({ page: String(page - 1) }) : undefined
  const nextHref = page < totalPages ? buildUrl({ page: String(page + 1) }) : undefined

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">
          Clientes
          <span className="ml-2 text-sm font-normal text-[#4A4A4A]">({total})</span>
        </h1>
        <Link
          href="/admin/clientes/abandonados"
          className="text-sm text-[#4A4A4A] border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"
        >
          Carritos abandonados
        </Link>
      </div>

      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por email…"
          className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        />
        <select
          name="brand"
          defaultValue={brand}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        >
          <option value="">Todas las marcas</option>
          {BRANDS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-[#1C1C1C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#4A4A4A] transition-colors"
        >
          Filtrar
        </button>
        {(q || brand) && (
          <Link
            href="/admin/clientes"
            className="text-sm text-[#4A4A4A] px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            Limpiar
          </Link>
        )}
      </form>

      <ClientesTable
        customers={customers}
        total={total}
        page={page}
        totalPages={totalPages}
        prevHref={prevHref}
        nextHref={nextHref}
      />
    </div>
  )
}
