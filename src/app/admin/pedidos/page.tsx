import Link from "next/link"
import { getAdminOrders, getOrderTabCounts } from "@/server/services/order.service"

const PAGE_SIZE = 25

const STATUS_LABELS: Record<string, string> = {
  ALL: "Todos",
  PENDING: "Nuevo",
  PAID: "Procesando",
  PACKED: "Empacado",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  PACKED: "bg-orange-100 text-orange-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-[#E31C23]",
}

const TABS = ["ALL", "PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]

interface SearchParams {
  status?: string
  page?: string
  q?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function PedidosPage({ searchParams }: Props) {
  const params = await searchParams
  const statusFilter = params.status ?? "ALL"
  const page = Math.max(1, parseInt(params.page ?? "1") || 1)
  const q = params.q?.trim() ?? ""

  const whereBase: Record<string, unknown> = {}
  if (statusFilter !== "ALL") whereBase.status = statusFilter
  if (q) {
    whereBase.OR = [
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
    ]
  }

  const tabCounts = await getOrderTabCounts(TABS)

  const { orders, total } = await getAdminOrders(statusFilter, q, page, PAGE_SIZE)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {}
    if (statusFilter !== "ALL") base.status = statusFilter
    if (q) base.q = q
    if (page > 1) base.page = String(page)
    const merged = { ...base, ...overrides }
    const qs = new URLSearchParams(
      Object.entries(merged).filter(([, v]) => v !== undefined) as [string, string][]
    ).toString()
    return `/admin/pedidos${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">
          Pedidos
          <span className="ml-2 text-sm font-normal text-[#4A4A4A]">({total})</span>
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-200">
        {TABS.map((tab, i) => (
          <Link
            key={tab}
            href={buildUrl({ status: tab === "ALL" ? undefined : tab, page: undefined })}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              statusFilter === tab
                ? "border-b-2 border-[#E31C23] text-[#E31C23]"
                : "text-[#4A4A4A] hover:text-[#1C1C1C]"
            }`}
          >
            {STATUS_LABELS[tab]}{" "}
            <span className="ml-1 text-xs text-gray-400">({tabCounts[i]})</span>
          </Link>
        ))}
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-3 mb-6">
        {statusFilter !== "ALL" && (
          <input type="hidden" name="status" value={statusFilter} />
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

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-[#4A4A4A] text-lg">No se encontraron pedidos.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Pedido</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Fecha</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Cliente</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Productos</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Total</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Pago</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Estado</th>
                    <th className="text-right px-4 py-3 text-[#4A4A4A] font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map((order: any) => {
                    const badge = STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-600"
                    const clientName =
                      order.customerName ??
                      order.userEmail ??
                      order.customerEmail ??
                      "—"
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-[#4A4A4A]">
                          #{order.id.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-[#4A4A4A] whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-[#1C1C1C] max-w-[160px] truncate">
                          {clientName}
                        </td>
                        <td className="px-4 py-3 text-[#4A4A4A]">{order.items.length}</td>
                        <td className="px-4 py-3 font-semibold text-[#1C1C1C]">
                          {formatCOP(Number(order.total))}
                        </td>
                        <td className="px-4 py-3 text-[#4A4A4A]">
                          {order.paymentMethod ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}
                          >
                            {STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/pedidos/${order.id}`}
                            className="text-xs font-medium text-[#E31C23] hover:underline"
                          >
                            Ver detalle
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-[#4A4A4A]">
              Página {page} de {totalPages} · {total} pedidos
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-[#1C1C1C]"
                >
                  ← Anterior
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-300 cursor-not-allowed">
                  ← Anterior
                </span>
              )}
              {page < totalPages ? (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-[#1C1C1C]"
                >
                  Siguiente →
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-300 cursor-not-allowed">
                  Siguiente →
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
