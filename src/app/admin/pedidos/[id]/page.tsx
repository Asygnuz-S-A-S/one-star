import { notFound } from "next/navigation"
import Link from "next/link"
import OrderDetailActions from "./OrderDetailActions"
import OrderCustomerForm from "./OrderCustomerForm"
import { getOrderById, type OrderDTO } from "@/server/services/order.service"
import { formatDateTime, formatCurrency } from "@/lib/dates"
import { PLACEHOLDER_IMAGE_URL } from "@/lib/product-image"
import {
  orderStatusBadge,
  orderStatusLabel,
  paymentStatusBadge,
  paymentStatusLabel,
} from "@/lib/order-status"

interface Props {
  params: Promise<{ id: string }>
}

interface ShippingInfo {
  phone: string
  address: string
  apartment: string
  city: string
  department: string
  postalCode: string
  shippingMethod: string
  shippingCost: number | null
  couponCode: string
  couponDiscount: number | null
}

function readShipping(raw: unknown): ShippingInfo {
  const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {}
  const text = (key: string) => (typeof source[key] === "string" ? (source[key] as string) : "")
  const num = (key: string) => (typeof source[key] === "number" ? (source[key] as number) : null)
  return {
    phone: text("phone"),
    address: text("address"),
    apartment: text("apartment"),
    city: text("city"),
    department: text("department"),
    postalCode: text("postalCode"),
    shippingMethod: text("shippingMethod"),
    shippingCost: num("shippingCost"),
    couponCode: text("couponCode"),
    couponDiscount: num("couponDiscount"),
  }
}

const SHIPPING_METHOD_LABELS: Record<string, string> = {
  standard: "Estándar",
  express: "Express",
}

const PAYMENT_HELP: Record<string, string> = {
  PENDING:
    "ePayco aún no confirmó este pago. Si el cliente no lo completó, cancélalo desde Acciones; si pagó y no se reflejó, verifica la referencia en el panel de ePayco antes de marcarlo como pagado.",
  REJECTED: "La pasarela rechazó el pago. El pedido no cuenta como venta ni descontó stock.",
  FAILED: "La transacción falló en la pasarela. El pedido no cuenta como venta ni descontó stock.",
  EXPIRED: "El pedido venció sin recibir el pago. No cuenta como venta ni descontó stock.",
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

  const items = order.items ?? []
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  )
  const shipping = readShipping(order.shippingAddress)
  const isPaid = order.paymentStatus === "APPROVED"
  const paymentHelp = PAYMENT_HELP[order.paymentStatus]

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
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${orderStatusBadge(order.status)}`}>
          {orderStatusLabel(order.status)}
        </span>
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${paymentStatusBadge(order.paymentStatus)}`}>
          Pago: {paymentStatusLabel(order.paymentStatus)}
        </span>
        <span className="text-sm text-[#4A4A4A] ml-auto">
          {formatDateTime(order.createdAt)}
        </span>
      </div>

      {!isPaid && paymentHelp && (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          <p className="font-semibold mb-1">Este pedido no es una venta confirmada.</p>
          <p>{paymentHelp}</p>
        </div>
      )}

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
                        className={`w-full h-full object-contain`}
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

          {/* Cliente y envío */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-4">
              Cliente y envío
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Row label="Nombre" value={order.customerName ?? order.userEmail} />
              <Row label="Email" value={order.customerEmail ?? order.userEmail} />
              <Row label="Teléfono" value={shipping.phone} />
              <Row label="Cuenta" value={order.userEmail} />
              <Row
                label="Dirección"
                value={[shipping.address, shipping.apartment].filter(Boolean).join(", ")}
              />
              <Row
                label="Ciudad"
                value={[shipping.city, shipping.department].filter(Boolean).join(", ")}
              />
              <Row label="Código postal" value={shipping.postalCode} />
              <Row
                label="Método de envío"
                value={SHIPPING_METHOD_LABELS[shipping.shippingMethod] ?? shipping.shippingMethod}
              />
            </dl>

            <OrderCustomerForm
              orderId={order.id}
              initial={{
                customerName: order.customerName ?? "",
                customerEmail: order.customerEmail ?? order.userEmail ?? "",
                phone: shipping.phone,
                address: shipping.address,
                apartment: shipping.apartment,
                city: shipping.city,
                department: shipping.department,
                postalCode: shipping.postalCode,
              }}
            />
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
              {shipping.couponCode && (
                <div className="flex justify-between">
                  <span className="text-[#4A4A4A]">Cupón {shipping.couponCode}</span>
                  <span className="text-green-700">
                    −{formatCurrency(shipping.couponDiscount ?? 0)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#4A4A4A]">Envío</span>
                {shipping.shippingCost ? (
                  <span className="text-[#1C1C1C]">{formatCurrency(shipping.shippingCost)}</span>
                ) : (
                  <span className="text-green-600 font-medium">Gratis</span>
                )}
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="font-semibold text-[#1C1C1C]">Total</span>
                <span className="font-bold text-[#1C1C1C] text-base">
                  {formatCurrency(Number(order.total))}
                </span>
              </div>
            </div>
          </div>

          {/* Pago */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-4">
              Pago
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-[#4A4A4A]">Estado</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${paymentStatusBadge(order.paymentStatus)}`}>
                  {paymentStatusLabel(order.paymentStatus)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#4A4A4A]">Método</span>
                <span className="text-[#1C1C1C]">{order.paymentMethod ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#4A4A4A]">Ref. ePayco</span>
                <span className="font-mono text-xs text-[#1C1C1C] break-all text-right">
                  {order.paymentReference ?? "sin notificación de la pasarela"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#4A4A4A]">Pagado el</span>
                <span className="text-[#1C1C1C] text-right">
                  {order.paidAt ? formatDateTime(order.paidAt) : "—"}
                </span>
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between gap-3 pt-1">
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
            paymentStatus={order.paymentStatus}
            currentTrackingNumber={order.trackingNumber ?? ""}
            hasCustomerEmail={Boolean(order.customerEmail)}
          />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2 min-w-0">
      <dt className="text-[#4A4A4A] w-32 shrink-0">{label}:</dt>
      <dd className="text-[#1C1C1C] break-words min-w-0">{value || "—"}</dd>
    </div>
  )
}
