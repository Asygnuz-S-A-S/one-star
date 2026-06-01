import { prisma } from "@/server/db/prisma"
import Link from "next/link"

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

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function ClientesPage({ searchParams }: Props) {
  const params = await searchParams
  const q = params.q?.trim() ?? ""
  const brand = params.brand ?? ""
  const page = Math.max(1, parseInt(params.page ?? "1") || 1)

  const where = {
    role: "CUSTOMER" as const,
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { orders: true } },
        orders: {
          where: { status: { not: "CANCELLED" } },
          select: { total: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

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

      {/* Filters */}
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

      {users.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-[#4A4A4A] text-lg">No se encontraron clientes.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Cliente</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Email</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Pedidos</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">LTV</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Registro</th>
                    <th className="text-right px-4 py-3 text-[#4A4A4A] font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((user) => {
                    const ltv = user.orders.reduce(
                      (sum, o) => sum + Number(o.total),
                      0
                    )
                    const initial = user.email.charAt(0).toUpperCase()
                    return (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#E31C23]/10 flex items-center justify-center text-[#E31C23] font-bold text-sm shrink-0">
                              {initial}
                            </div>
                            <span className="font-medium text-[#1C1C1C]">
                              {user.email.split("@")[0]}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#4A4A4A]">{user.email}</td>
                        <td className="px-4 py-3 text-[#4A4A4A]">{user._count.orders}</td>
                        <td className="px-4 py-3 font-semibold text-[#1C1C1C]">
                          {formatCOP(ltv)}
                        </td>
                        <td className="px-4 py-3 text-[#4A4A4A] whitespace-nowrap">
                          {new Date(user.createdAt).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/clientes/${user.id}`}
                            className="text-xs font-medium text-[#E31C23] hover:underline"
                          >
                            Ver perfil
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
              Página {page} de {totalPages} · {total} clientes
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
