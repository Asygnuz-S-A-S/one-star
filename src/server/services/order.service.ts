import "server-only"
import {
  createOrder,
  findOrderById,
  findManyOrders,
  findOrdersByUserId,
  countOrders,
  updateOrderStatus,
  updateOrderStatusAndTracking,
  getOrderStats,
  getVariantsStock,
  markOrderPaidWithStock,
} from "../repositories/order.repository"
import type { Prisma, OrderStatus } from "@prisma/client"
import { getERPAdapter } from "../erp"

export interface OrderItemDTO {
  id: string
  productId: string
  productName: string
  productImage: string | null
  quantity: number
  unitPrice: number
}

export interface OrderDTO {
  id: string
  status: string
  total: number
  paymentMethod: string | null
  trackingNumber: string | null
  customerEmail: string | null
  customerName: string | null
  shippingAddress: unknown
  userId: string | null
  userEmail: string | null
  createdAt: string
  updatedAt: string
  items?: OrderItemDTO[]
}

function mapToDTO(raw: {
  id: string
  status: string
  total: { toNumber: () => number }
  paymentMethod: string | null
  trackingNumber: string | null
  customerEmail: string | null
  customerName: string | null
  shippingAddress: unknown
  userId: string | null
  user?: { email: string } | null
  createdAt: Date
  updatedAt: Date
  items?: Array<{
    id: string
    productId: string
    product?: { name?: string; images?: Array<{ url: string }> }
    quantity: number
    unitPrice: { toNumber: () => number }
  }>
}): OrderDTO {
  return {
    id: raw.id,
    status: raw.status,
    total: raw.total.toNumber(),
    paymentMethod: raw.paymentMethod,
    trackingNumber: raw.trackingNumber,
    customerEmail: raw.customerEmail,
    customerName: raw.customerName,
    shippingAddress: raw.shippingAddress,
    userId: raw.userId,
    userEmail: raw.user?.email ?? null,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    items: raw.items
      ? raw.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name ?? "Producto desconocido",
          productImage: item.product?.images?.[0]?.url ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toNumber(),
        }))
      : undefined,
  }
}

export async function placeOrder(
  userId: string | null,
  data: {
    total: number
    /**
     * items ahora incluye sku y productName para que la capa ERP
     * pueda sincronizar inventario y factura sin consultas adicionales.
     */
    items: {
      productId: string
      variantId?: string
      sku: string
      productName: string
      quantity: number
      unitPrice: number
    }[]
    shippingAddress?: unknown
    customerName?: string
    customerEmail?: string
    paymentMethod?: string
  }
): Promise<OrderDTO> {
  // 0. Valida disponibilidad de stock ANTES de crear el pedido.
  //    El stock se descuenta luego al marcar el pedido como PAID, pero se
  //    rechaza de entrada si ya no hay unidades suficientes.
  const variantIds = data.items
    .map((i) => i.variantId)
    .filter((id): id is string => Boolean(id))

  if (variantIds.length > 0) {
    const stocks = await getVariantsStock(variantIds)
    const stockMap = new Map(stocks.map((s) => [s.id, s.stock]))
    for (const item of data.items) {
      if (!item.variantId) continue
      const available = stockMap.get(item.variantId) ?? 0
      if (available < item.quantity) {
        throw new Error(`Stock insuficiente para "${item.productName}".`)
      }
    }
  }

  const orderInput: Prisma.OrderCreateInput = {
    ...(userId ? { user: { connect: { id: userId } } } : {}),
    total: data.total,
    shippingAddress: data.shippingAddress as Prisma.InputJsonValue,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    paymentMethod: data.paymentMethod,
    items: {
      create: data.items.map((i) => ({
        product: { connect: { id: i.productId } },
        ...(i.variantId ? { variant: { connect: { id: i.variantId } } } : {}),
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    },
  }

  // 1. Persiste el pedido en la BD de One Star primero.
  //    El pedido siempre queda registrado, independientemente del ERP.
  const order = await createOrder(orderInput)

  // 2. Notifica al ERP de forma asincrónica (fire-and-forget con modo degradado).
  //    Si el ERP falla, el pedido ya está guardado y se puede reintentar luego.
  const erp = getERPAdapter()
  erp
    .onOrderConfirmed({
      orderId: order.id,
      customer: {
        name: data.customerName ?? "Cliente",
        email: data.customerEmail ?? "",
      },
      items: data.items.map((i) => ({
        sku: i.sku,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      total: data.total,
      paymentMethod: data.paymentMethod ?? "pending",
      shippingAddress: data.shippingAddress as Record<string, unknown> | undefined,
    })
    .then((result) => {
      if (!result.success) {
        // TODO: en producción, encolar este reintento en una cola de trabajos
        // (e.g., BullMQ, pg-boss) para garantizar eventual consistencia.
        console.error(
          `[ERP] Sincronización falló para pedido ${order.id}:`,
          result.error
        )
      }
    })
    .catch((err) => {
      console.error(`[ERP] Error inesperado sincronizando pedido ${order.id}:`, err)
    })

  return mapToDTO(order)
}

export async function getOrderById(id: string): Promise<OrderDTO | null> {
  const order = await findOrderById(id)
  return order ? mapToDTO(order) : null
}

export async function getRecentOrders(take: number = 20): Promise<OrderDTO[]> {
  const orders = await findManyOrders(take)
  return orders.map(mapToDTO)
}

export async function getUserOrders(userId: string): Promise<OrderDTO[]> {
  const orders = await findOrdersByUserId(userId)
  return orders.map(mapToDTO)
}

export async function getAdminOrders(
  statusFilter: string,
  q: string,
  page: number,
  pageSize: number
) {
  const where: Prisma.OrderWhereInput = {}
  if (statusFilter !== "ALL") where.status = statusFilter as OrderStatus
  if (q) {
    where.OR = [
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
    ]
  }

  const [rows, total] = await Promise.all([
    findManyOrders(pageSize, (page - 1) * pageSize, where),
    countOrders(where),
  ])

  return { orders: rows.map(mapToDTO), total }
}

export async function getOrderTabCounts(tabs: string[]) {
  return Promise.all(
    tabs.map((tab) =>
      countOrders(tab === "ALL" ? {} : { status: tab as OrderStatus })
    )
  )
}

export async function changeOrderStatus(
  id: string,
  status: OrderStatus
): Promise<void> {
  // Al pasar a PAID se descuenta el stock de forma transaccional.
  if (status === "PAID") {
    await markOrderPaidWithStock(id)
    return
  }
  await updateOrderStatus(id, status)
}

export async function changeOrderStatusAndTracking(
  id: string,
  status: string,
  trackingNumber?: string
): Promise<void> {
  if (status === "PAID") {
    await markOrderPaidWithStock(id, trackingNumber)
    return
  }
  await updateOrderStatusAndTracking(id, status, trackingNumber)
}

export async function getDashboardOrderStats() {
  return getOrderStats()
}
