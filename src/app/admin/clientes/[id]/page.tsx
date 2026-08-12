import Link from "next/link"
import { getCustomerProfile } from "@/server/services/user.service"
import { notFound } from "next/navigation"
import { formatDate, formatDateLong, formatCurrency } from "@/lib/dates"
import { PLACEHOLDER_IMAGE_URL } from "@/lib/product-image"

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_LABELS: Record<string, string> = {
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



export default async function ClienteProfilePage({ params }: Props) {
  const { id } = await params
  const user = await getCustomerProfile(id)

  if (!user) notFound()

  const ltv = user.orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + Number(o.total), 0)

  const hasCart = (user.cart?.items.length ?? 0) > 0

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/clientes" className="text-sm text-[#4A4A4A] hover:text-[#1C1C1C]">
          ← Clientes
        </Link>
        <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">
          Perfil de cliente
        </h1>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-4">
            Datos personales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[#4A4A4A] mb-0.5">Email</p>
              <p className="font-medium text-[#1C1C1C]">{user.email}</p>
            </div>
            <div>
              <p className="text-[#4A4A4A] mb-0.5">Nombre</p>
              {user.name ? (
                <p className="font-medium text-[#1C1C1C]">{user.name} {user.lastName}</p>
              ) : (
                <p className="text-[#4A4A4A] italic">No registrado</p>
              )}
            </div>
            <div>
              <p className="text-[#4A4A4A] mb-0.5">Fecha de registro</p>
              <p className="font-medium text-[#1C1C1C]">
                {formatDateLong(user.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-[#4A4A4A] mb-0.5">Total pedidos</p>
              <p className="font-medium text-[#1C1C1C]">{user.orders.length}</p>
            </div>
            <div>
              <p className="text-[#4A4A4A] mb-0.5">LTV (valor de por vida)</p>
              <p className="font-bold text-[#1C1C1C] text-base">{formatCurrency(ltv)}</p>
            </div>
            <div>
              <p className="text-[#4A4A4A] mb-0.5">Teléfono</p>
              {user.phone ? (
                <p className="font-medium text-[#1C1C1C]">{user.phone}</p>
              ) : (
                <p className="text-[#4A4A4A] italic">No registrado</p>
              )}
            </div>
            <div>
              <p className="text-[#4A4A4A] mb-0.5">Marca preferida</p>
              {user.preferredBrand ? (
                <p className="font-medium text-[#1C1C1C]">{user.preferredBrand}</p>
              ) : (
                <p className="text-[#4A4A4A] italic">No registrado</p>
              )}
            </div>
            <div>
              <p className="text-[#4A4A4A] mb-0.5">Cédula</p>
              {user.cedula ? (
                <p className="font-medium text-[#1C1C1C]">{user.cedula}</p>
              ) : (
                <p className="text-[#4A4A4A] italic">No registrado</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-4">
            Historial de pedidos ({user.orders.length})
          </h2>
          {user.orders.length === 0 ? (
            <p className="text-[#4A4A4A] text-sm italic">Sin pedidos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 text-[#4A4A4A] font-semibold">Pedido</th>
                    <th className="text-left px-4 py-2.5 text-[#4A4A4A] font-semibold">Fecha</th>
                    <th className="text-left px-4 py-2.5 text-[#4A4A4A] font-semibold">Productos</th>
                    <th className="text-left px-4 py-2.5 text-[#4A4A4A] font-semibold">Total</th>
                    <th className="text-left px-4 py-2.5 text-[#4A4A4A] font-semibold">Estado</th>
                    <th className="text-right px-4 py-2.5 text-[#4A4A4A] font-semibold">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {user.orders.map((order) => {
                    const badge = STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-600"
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-[#4A4A4A]">
                          #{order.id.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-4 py-2.5 text-[#4A4A4A] whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-4 py-2.5 text-[#4A4A4A]">{order.items.length}</td>
                        <td className="px-4 py-2.5 font-semibold text-[#1C1C1C]">
                          {formatCurrency(Number(order.total))}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}
                          >
                            {STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <a
                            href={`/admin/pedidos/${order.id}`}
                            className="text-xs font-medium text-[#E31C23] hover:underline"
                          >
                            Ver
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {hasCart && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-4">
              Carrito actual ({user.cart!.items.length} producto
              {user.cart!.items.length !== 1 ? "s" : ""})
            </h2>
            <div className="space-y-3">
              {user.cart!.items.map((item) => {
                const img = item.product.images[0]
                const price = Number(item.product.basePrice)
                return (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img?.url ?? PLACEHOLDER_IMAGE_URL}
                        alt={img?.alt ?? `${item.product.name} — sin foto`}
                        className={`w-full h-full ${img ? "object-cover" : "object-contain"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#1C1C1C] text-sm truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-[#4A4A4A]">
                        Talla: {item.variant.size} · Color: {item.variant.color} · Qty:{" "}
                        {item.quantity}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-[#1C1C1C] text-sm">
                        {formatCurrency(price * item.quantity)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
