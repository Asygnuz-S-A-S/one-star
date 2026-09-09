import Link from "next/link"
import {
  ADMIN_ORDER_FILTERS,
  getAdminOrders,
  getOrderTabCounts,
  isAdminOrderFilter,
  type AdminOrderFilter,
} from "@/server/services/order.service"
import { PedidosTable } from "@/components/admin/PedidosTable"

const PAGE_SIZE = 25

const TAB_LABELS: Record<AdminOrderFilter, string> = {
  ALL: "Todos los pagados",
  PAID: "Por despachar",
  SHIPPED: "Enviados",
  DELIVERED: "Entregados",
  CANCELLED: "Cancelados",
  UNPAID: "Sin pagar",
}

const TAB_HINTS: Partial<Record<AdminOrderFilter, string>> = {
  ALL: "Ventas con pago confirmado por la pasarela, en cualquier estado de despacho.",
  UNPAID:
    "Pedidos sin pago confirmado: el cliente llegó a ePayco y no completó el pago, la pasarela lo rechazó o el pedido venció. No cuentan como ventas y no descuentan stock.",
}

interface SearchParams {
  status?: string
  page?: string
  q?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function PedidosPage({ searchParams }: Props) {
  const params = await searchParams
  const filter: AdminOrderFilter =
    params.status && isAdminOrderFilter(params.status) ? params.status : "ALL"
  const page = Math.max(1, parseInt(params.page ?? "1") || 1)
  const q = params.q?.trim() ?? ""

  const [tabCounts, { orders, total }] = await Promise.all([
    getOrderTabCounts(ADMIN_ORDER_FILTERS),
    getAdminOrders(filter, q, page, PAGE_SIZE),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {}
    if (filter !== "ALL") base.status = filter
    if (q) base.q = q
    if (page > 1) base.page = String(page)
    const merged = { ...base, ...overrides }
    const qs = new URLSearchParams(
      Object.entries(merged).filter(([, v]) => v !== undefined) as [string, string][]
    ).toString()
    return `/admin/pedidos${qs ? `?${qs}` : ""}`
  }

  const prevHref = page > 1 ? buildUrl({ page: String(page - 1) }) : undefined
  const nextHref = page < totalPages ? buildUrl({ page: String(page + 1) }) : undefined
  const hint = TAB_HINTS[filter]

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">
          Pedidos
          <span className="ml-2 text-sm font-normal text-[#4A4A4A]">({total})</span>
        </h1>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4 border-b border-gray-200">
        {ADMIN_ORDER_FILTERS.map((tab, i) => (
          <Link
            key={tab}
            href={buildUrl({ status: tab === "ALL" ? undefined : tab, page: undefined })}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              filter === tab
                ? "border-b-2 border-[#E31C23] text-[#E31C23]"
                : tab === "UNPAID"
                  ? "text-[#4A4A4A] hover:text-[#1C1C1C] ml-auto"
                  : "text-[#4A4A4A] hover:text-[#1C1C1C]"
            }`}
          >
            {TAB_LABELS[tab]}{" "}
            <span className="ml-1 text-xs text-gray-400">({tabCounts[i]})</span>
          </Link>
        ))}
      </div>

      {hint && (
        <p className="text-xs text-[#4A4A4A] mb-6 max-w-3xl">{hint}</p>
      )}

      {/* Search */}
      <form method="GET" className="flex gap-3 mb-6">
        {filter !== "ALL" && (
          <input type="hidden" name="status" value={filter} />
        )}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por email o nombre…"
          className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        />
        <button
          type="submit"
          className="bg-[#1C1C1C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#4A4A4A] transition-colors"
        >
          Buscar
        </button>
        {q && (
          <Link
            href={buildUrl({ q: undefined, page: undefined })}
            className="text-sm text-[#4A4A4A] px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            Limpiar
          </Link>
        )}
      </form>

      <PedidosTable
        orders={orders}
        total={total}
        page={page}
        totalPages={totalPages}
        prevHref={prevHref}
        nextHref={nextHref}
      />
    </div>
  )
}
