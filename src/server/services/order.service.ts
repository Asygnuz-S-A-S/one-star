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
import { findVariantsForPricing } from "../repositories/variant.repository"
import type { Prisma, OrderStatus } from "@prisma/client"
import { getERPAdapter } from "../erp"
import { sendOrderConfirmationEmail } from "./email.service"
import { getShippingCost, type ShippingMethod } from "@/lib/shipping"
import {
  validateCouponForOrder,
  registerCouponUsage,
  releaseCouponUsage,
} from "./coupon.service"

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

/**
 * Ítem del pedido tal como se persiste, con el precio resuelto en servidor.
 */
interface PricedOrderItem {
  productId: string
  variantId: string
  sku: string
  productName: string
  quantity: number
  unitPrice: number
}

/**
 * Resuelve los precios reales desde la BD para cada ítem del carrito.
 * SEGURIDAD: los precios que envía el cliente se ignoran por completo;
 * unitPrice, sku y productName salen de la base de datos.
 */
async function priceItemsFromDatabase(
  items: { productId: string; variantId?: string; quantity: number; productName: string }[]
): Promise<PricedOrderItem[]> {
  const variantIds = items.map((i) => i.variantId).filter((id): id is string => Boolean(id))
  if (variantIds.length !== items.length) {
    throw new Error("Todos los ítems del pedido deben incluir una variante.")
  }

  const variants = await findVariantsForPricing(variantIds)
  const variantMap = new Map(variants.map((v) => [v.id, v]))

  return items.map((item) => {
    const variant = item.variantId ? variantMap.get(item.variantId) : undefined
    if (!variant) {
      throw new Error(`La variante del producto "${item.productName}" ya no está disponible.`)
    }
    if (variant.productId !== item.productId) {
      throw new Error(`Datos de pedido inconsistentes para "${item.productName}".`)
    }
    const { product } = variant
    const unitPrice =
      product.isOnSale && product.salePrice !== null
        ? product.salePrice.toNumber()
        : product.basePrice.toNumber()
    return {
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
    }
  })
}

export async function placeOrder(
  userId: string | null,
  data: {
    /**
     * items incluye sku y productName solo como referencia del cliente;
     * el servidor resuelve precio, sku y nombre reales desde la BD.
     */
    items: {
      productId: string
      variantId?: string
      sku: string
      productName: string
      quantity: number
    }[]
    shippingMethod: ShippingMethod
    shippingAddress?: unknown
    customerName?: string
    customerEmail?: string
    paymentMethod?: string
    /** Código de cupón; el descuento se valida y recalcula en servidor */
    couponCode?: string
  }
): Promise<OrderDTO> {
  // 0. SEGURIDAD: recalcula precios desde la BD. El total nunca viene del cliente.
  const pricedItems = await priceItemsFromDatabase(data.items)
  const subtotal = pricedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  // El envío gratis se decide sobre el subtotal antes del descuento
  const shippingCost = getShippingCost(data.shippingMethod, subtotal)

  // 0.2 Cupón: se revalida en servidor y el descuento se recalcula desde la BD.
  let appliedCoupon: { id: string; code: string; discountAmount: number } | null = null
  if (data.couponCode) {
    const validation = await validateCouponForOrder(data.couponCode, subtotal)
    if (!validation.valid) {
      throw new Error(`El cupón "${data.couponCode}" ya no es válido: ${validation.reason}`)
    }
    appliedCoupon = {
      id: validation.id,
      code: validation.code,
      discountAmount: validation.discountAmount,
    }
  }

  const discountAmount = appliedCoupon?.discountAmount ?? 0
  const total = subtotal - discountAmount + shippingCost

  // 0.1 Valida disponibilidad de stock ANTES de crear el pedido.
  //     El stock se descuenta luego al marcar el pedido como PAID, pero se
  //     rechaza de entrada si ya no hay unidades suficientes.
  const variantIds = pricedItems.map((i) => i.variantId)

  if (variantIds.length > 0) {
    const stocks = await getVariantsStock(variantIds)
    const stockMap = new Map(stocks.map((s) => [s.id, s.stock]))
    for (const item of pricedItems) {
      const available = stockMap.get(item.variantId) ?? 0
      if (available < item.quantity) {
        throw new Error(`Stock local insuficiente para "${item.productName}".`)
      }
    }
  }

  // 0.5 Validación de Stock en Tiempo Real (JIT) contra el ERP
  const erp = getERPAdapter()
  if (erp.validateStock) {
    const erpItemsToValidate = pricedItems.map(i => ({ sku: i.sku, qty: i.quantity }))
    const isValidInERP = await erp.validateStock(erpItemsToValidate)

    if (!isValidInERP) {
      throw new Error(`Lo sentimos, el stock de uno o más productos se agotó en la tienda principal justo ahora. Por favor actualiza tu carrito.`)
    }
  }

  // El shippingAddress registrado refleja el costo y descuento calculados en servidor
  const shippingAddress = {
    ...(typeof data.shippingAddress === "object" && data.shippingAddress !== null
      ? (data.shippingAddress as Record<string, unknown>)
      : {}),
    shippingMethod: data.shippingMethod,
    shippingCost,
    ...(appliedCoupon
      ? { couponCode: appliedCoupon.code, couponDiscount: appliedCoupon.discountAmount }
      : {}),
  }

  const orderInput: Prisma.OrderCreateInput = {
    ...(userId ? { user: { connect: { id: userId } } } : {}),
    total,
    shippingAddress: shippingAddress as Prisma.InputJsonValue,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    paymentMethod: data.paymentMethod,
    items: {
      create: pricedItems.map((i) => ({
        product: { connect: { id: i.productId } },
        variant: { connect: { id: i.variantId } },
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    },
  }

  // 0.9 Reserva el uso del cupón ANTES de crear el pedido: el incremento es
  //     condicional (no supera maxUses), así dos compras concurrentes no
  //     exceden el tope. Si el pedido luego falla, se libera el uso.
  if (appliedCoupon) {
    const usageRegistered = await registerCouponUsage(appliedCoupon.id)
    if (!usageRegistered) {
      throw new Error(`El cupón "${appliedCoupon.code}" ya no es válido: alcanzó su límite de usos`)
    }
  }

  // 1. Persiste el pedido en la BD de One Star primero.
  //    El pedido siempre queda registrado, independientemente del ERP.
  let order: Awaited<ReturnType<typeof createOrder>>
  try {
    order = await createOrder(orderInput)
  } catch (error) {
    if (appliedCoupon) {
      await releaseCouponUsage(appliedCoupon.id)
    }
    throw error
  }

  // 2. Notifica al ERP de forma asincrónica (fire-and-forget con modo degradado).
  //    Si el ERP falla, el pedido ya está guardado y se puede reintentar luego.

  erp
    .onOrderConfirmed({
      orderId: order.id,
      customer: {
        name: data.customerName ?? "Cliente",
        email: data.customerEmail ?? "",
      },
      items: pricedItems.map((i) => ({
        sku: i.sku,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      total,
      paymentMethod: data.paymentMethod ?? "pending",
      shippingAddress,
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

  // 3. Correo de confirmación de compra al cliente (fire-and-forget: si el
  //    correo falla, el pedido ya quedó guardado y no se ve afectado).
  if (data.customerEmail) {
    void sendOrderConfirmationEmail({
      email: data.customerEmail,
      name: data.customerName ?? undefined,
      orderId: order.id,
      items: pricedItems.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      total,
    }).catch((err) =>
      console.error(`[Email] Confirmación del pedido ${order.id} falló:`, err)
    )
  }

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
