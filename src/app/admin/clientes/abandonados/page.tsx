import { getAbandonedCarts } from "@/server/services/abandoned-cart.service"
import AbandonedCartRow from "./AbandonedCartRow"

const PAGE_SIZE = 25

interface SearchParams {
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

function cartValue(cartData: unknown): number {
  if (!cartData || typeof cartData !== "object") return 0
  const data = cartData as Record<string, unknown>
  if (Array.isArray(data.items)) {
    return (data.items as Array<Record<string, unknown>>).reduce((sum, item) => {
      const price = Number(item.price ?? item.unitPrice ?? 0)
      const qty = Number(item.quantity ?? 1)
      return sum + price * qty
    }, 0)
  }
  if (typeof data.total === "number") return data.total
  return 0
}

export default async function AbandonedCartsPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1") || 1)

  const { carts, total } = await getAbandonedCarts(page, PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <a href="/admin/clientes" className="text-sm text-[#4A4A4A] hover:text-[#1C1C1C]">
          ← Clientes
        </a>
        <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">
          Carritos abandonados
          <span className="ml-2 text-sm font-normal text-[#4A4A4A]">({total})</span>
        </h1>
      </div>

      {carts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-[#4A4A4A] text-lg">No hay carritos abandonados.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Email</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Fecha abandono</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Valor carrito</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Recuperado</th>
                    <th className="text-right px-4 py-3 text-[#4A4A4A] font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {carts.map((cart) => (
                    <AbandonedCartRow
                      key={cart.id}
                      cart={{
                        id: cart.id,
                        email: cart.email,
                        createdAt: cart.createdAt,
                        recoveredAt: cart.recoveredAt,
                        cartValue: cartValue(cart.cartData),
                      }}
                      formatCOP={formatCOP}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-[#4A4A4A]">
              Página {page} de {totalPages} · {total} registros
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <a
                  href={`/admin/clientes/abandonados?page=${page - 1}`}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-[#1C1C1C]"
                >
                  ← Anterior
                </a>
              ) : (
                <span className="px-3 py-1.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-300 cursor-not-allowed">
                  ← Anterior
                </span>
              )}
              {page < totalPages ? (
                <a
                  href={`/admin/clientes/abandonados?page=${page + 1}`}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-[#1C1C1C]"
                >
                  Siguiente →
                </a>
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
