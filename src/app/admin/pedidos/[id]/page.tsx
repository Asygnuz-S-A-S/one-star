import { notFound } from "next/navigation"
import Link from "next/link"
import OrderDetailActions from "./OrderDetailActions"
import { getOrderById, type OrderDTO } from "@/server/services/order.service"
import { formatDateTime, formatCurrency } from "@/lib/dates"
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



export default async function PedidoDetailPage({ params }: Props) {
  const { id } = await params

  let order: OrderDTO | null = null
  try {
    order = await getOrderById(id)
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[PedidoDetail]", error)
    }
    notFound()
  }

  if (!order) notFound()

  const badge = STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-600"
  const items = order.items ?? []
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  )

  let shippingAddress: Record<string, string> | null = null
  if (order.shippingAddress && typeof order.shippingAddress === "object") {
    shippingAddress = order.shippingAddress as Record<string, string>
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Link href="/admin/pedidos" className="text-sm text-[#4A4A4A] hover:text-[#1C1C1C]">
          ← Pedidos
        </Link>
        <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">
          Pedido #{order.id.slice(-8).toUpperCase()}
        </h1>
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${badge}`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
        <span className="text-sm text-[#4A4A4A] ml-auto">
          {formatDateTime(order.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Productos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-4">
              Productos
            </h2>
            <div className="space-y-4">
              {items.map((item) => {
                const imgUrl = item.productImage
                return (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl ?? PLACEHOLDER_IMAGE_URL}
                        alt={imgUrl ? item.productName : `${item.productName} — sin foto`}
                        className={`w-full h-full ${imgUrl ? "object-cover" : "object-contain"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#1C1C1C] truncate">{item.productName}</p>
                      <p className="text-xs text-[#4A4A4A]">
                        Cantidad: {item.quantity} · Precio unitario:{" "}
                        {formatCurrency(Number(item.unitPrice))}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-[#1C1C1C]">
                        {formatCurrency(Number(item.unitPrice) * item.quantity)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Cliente */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-4">
              Cliente
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-[#4A4A4A] w-28 shrink-0">Nombre:</span>
                <span className="text-[#1C1C1C]">
                  {order.customerName ?? order.userEmail ?? "—"}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#4A4A4A] w-28 shrink-0">Email:</span>
                <span className="text-[#1C1C1C]">
                  {order.customerEmail ?? order.userEmail ?? "—"}
                </span>
              </div>
              {shippingAddress && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[#4A4A4A] mb-1 font-medium">Dirección de envío:</p>
                  <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-[#4A4A4A] whitespace-pre-wrap">
                    {JSON.stringify(shippingAddress, null, 2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Resumen */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-4">
              Resumen
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#4A4A4A]">Subtotal</span>
                <span className="text-[#1C1C1C]">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A4A4A]">Envío</span>
                <span className="text-green-600 font-medium">Gratis</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="font-semibold text-[#1C1C1C]">Total</span>
                <span className="font-bold text-[#1C1C1C] text-base">
                  {formatCurrency(Number(order.total))}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-[#4A4A4A]">Método de pago</span>
                <span className="text-[#1C1C1C]">{order.paymentMethod ?? "—"}</span>
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between pt-1">
                  <span className="text-[#4A4A4A]">Tracking</span>
                  <span className="font-mono text-xs text-[#1C1C1C]">
                    {order.trackingNumber}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          <OrderDetailActions
            orderId={order.id}
            currentStatus={order.status}
            currentTrackingNumber={order.trackingNumber ?? ""}
          />
        </div>
      </div>
    </div>
  )
}
