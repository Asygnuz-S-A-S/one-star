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
} from "../repositories/order.repository"
import type { Prisma, OrderStatus } from "@prisma/client"

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
    items: { productId: string; quantity: number; unitPrice: number }[]
    shippingAddress?: unknown
    customerName?: string
    customerEmail?: string
  }
): Promise<OrderDTO> {
  const orderInput: Prisma.OrderCreateInput = {
    ...(userId ? { user: { connect: { id: userId } } } : {}),
    total: data.total,
    shippingAddress: data.shippingAddress as Prisma.InputJsonValue,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    items: {
      create: data.items.map((i) => ({
        product: { connect: { id: i.productId } },
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    },
  }

  const order = await createOrder(orderInput)
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
  await updateOrderStatus(id, status)
}

export async function changeOrderStatusAndTracking(
  id: string,
  status: string,
  trackingNumber?: string
): Promise<void> {
  await updateOrderStatusAndTracking(id, status, trackingNumber)
}

export async function getDashboardOrderStats() {
  return getOrderStats()
}
