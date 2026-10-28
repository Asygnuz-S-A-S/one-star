import "server-only"

import { getProducts, type AppProductFilter } from "./product.service"
import {
  findProductForStockCheck,
  findOrdersForAssistant,
} from "../repositories/assistant.repository"
import {
  type AssistantProductsQuery,
  type AssistantStockQuery,
  type AssistantOrderQuery,
  normalizeDigits,
  normalizePhone10,
  normalizeSearchText,
} from "../validators/assistant.validator"
import { getShippingTrackingAdapter } from "../shipping/tracking"
import type { TrackingEvent } from "../shipping/tracking"

export interface AssistantProductDTO {
  name: string
  brand: string
  category: string
  gender: string
  color: string
  price: number
  salePrice: number | null
  currency: string
  sizesAvailable: string[]
  inStock: boolean
  url: string
  imageUrl: string
}

export interface AssistantProductsResponse {
  total: number
  products: AssistantProductDTO[]
}

export interface AssistantStockResponse {
  product: string
  size: string
  available: boolean
  lowStock: boolean
  price: number
  currency: string
  url: string
  sizesAvailable?: string[]
}

export interface AssistantOrderDTO {
  number: string
  createdAt: string
  status: string
  items: string
  carrier: string | null
  trackingNumber: string | null
  tracking: TrackingEvent | null
  trackingUrl: string | null
  eta: string | null
}

export interface AssistantOrdersResponse {
  orders: AssistantOrderDTO[]
}

/**
 * Traduce el estado interno del pedido al lenguaje claro esperado por el cliente.
 */
function mapOrderStatusToClient(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pago pendiente"
    case "PAID":
      return "Pago recibido, preparando"
    case "SHIPPED":
      return "En camino"
    case "DELIVERED":
      return "Entregado"
    case "CANCELLED":
      return "Cancelado"
    default:
      return status
  }
}

/**
 * 1. Consulta productos para el asistente:
 * Solo publicados y con stock, orden razonable, máximo 5 resultados,
 * búsqueda sin tildes ni mayúsculas, filtros por marca, género, talla y precio máximo.
 */
export async function searchAssistantProducts(
  query: AssistantProductsQuery,
  baseUrl: string
): Promise<AssistantProductsResponse> {
  const limit = Math.min(5, Math.max(1, query.limit || 5))

  const filter: AppProductFilter = {
    status: "active",
    hasStock: "yes",
    ...(query.q ? { q: normalizeSearchText(query.q) } : {}),
    ...(query.brand ? { marca: query.brand } : {}),
    ...(query.gender ? { genero: query.gender } : {}),
    ...(query.size ? { talla: query.size } : {}),
    ...(query.maxPrice ? { precio_max: String(query.maxPrice) } : {}),
  }

  const result = await getProducts(filter, limit)

  const products: AssistantProductDTO[] = result.products.map((prod) => {
    const availableVariants = prod.variants.filter((v) => (v.stock ?? 0) > 0)
    const sizes = Array.from(new Set(availableVariants.map((v) => v.size)))

    const color =
      availableVariants[0]?.color ||
      prod.variants[0]?.color ||
      ""

    return {
      name: prod.name,
      brand: prod.brandName || prod.brand || "",
      category: prod.category?.name || "",
      gender: (prod.gender || "unisex").toLowerCase(),
      color,
      price: prod.basePrice,
      salePrice: prod.isOnSale ? prod.salePrice : null,
      currency: "COP",
      sizesAvailable: sizes,
      inStock: true,
      url: `${baseUrl.replace(/\/$/, "")}/productos/${prod.slug}`,
      imageUrl: prod.images[0]?.url || "",
    }
  })

  return {
    total: result.total,
    products,
  }
}

/**
 * 2. Consulta disponibilidad de stock para un producto y talla:
 * Nunca devuelve cantidades exactas; lowStock con 2 o menos unidades.
 * Si la talla no existe, devuelve available: false y sizesAvailable.
 */
export async function checkAssistantStock(
  query: AssistantStockQuery,
  baseUrl: string
): Promise<AssistantStockResponse | null> {
  const product = await findProductForStockCheck(query.product)
  if (!product) return null

  const targetSize = query.size.trim().toLowerCase()
  const matchingVariant = product.variants.find(
    (v) => v.size.trim().toLowerCase() === targetSize
  )

  const availableVariants = product.variants.filter((v) => (v.stock ?? 0) > 0)
  const sizesAvailable = Array.from(new Set(availableVariants.map((v) => v.size)))

  const price = product.isOnSale && product.salePrice
    ? Number(product.salePrice)
    : Number(product.basePrice)

  const url = `${baseUrl.replace(/\/$/, "")}/productos/${product.slug}`

  if (!matchingVariant) {
    return {
      product: product.name,
      size: query.size.trim(),
      available: false,
      lowStock: false,
      price,
      currency: "COP",
      url,
      sizesAvailable,
    }
  }

  const stock = matchingVariant.stock ?? 0
  const available = stock > 0
  const lowStock = available && stock <= 2

  const response: AssistantStockResponse = {
    product: product.name,
    size: matchingVariant.size,
    available,
    lowStock,
    price,
    currency: "COP",
    url,
  }

  if (!available) {
    response.sizesAvailable = sizesAvailable
  }

  return response
}

/**
 * 3. Consulta de seguimiento de pedidos:
 * Regla de verificación: cédula igual Y (teléfono igual a los últimos 10 dígitos de waPhone O número igual).
 * Devuelve hasta 3 pedidos más recientes sin exponer datos personales (PII).
 */
export async function searchAssistantOrders(
  query: AssistantOrderQuery
): Promise<AssistantOrdersResponse | null> {
  const normCedula = normalizeDigits(query.cedula)
  const normWaPhone = normalizePhone10(query.waPhone)

  if (!normCedula || !normWaPhone) {
    return null
  }

  const orders = await findOrdersForAssistant(normCedula)
  if (orders.length === 0) {
    return null
  }

  // Filtrar y verificar pedidos según la regla del contrato
  const queryNumber = query.number?.trim().toLowerCase().replace(/^#|^os-/i, "")

  const verifiedOrders = orders.filter((order) => {
    // 1. Verificación de cédula
    const orderDoc = normalizeDigits(
      order.customerDocument ||
      String((order.shippingAddress as Record<string, unknown> | null)?.cedula ?? "") ||
      order.user?.cedula ||
      ""
    )
    if (orderDoc !== normCedula) {
      return false
    }

    // 2. Verificación de waPhone o número
    const orderPhone = normalizePhone10(
      order.customerPhone ||
      String((order.shippingAddress as Record<string, unknown> | null)?.phone ?? "") ||
      ""
    )

    const phoneMatches = orderPhone.length >= 7 && normWaPhone.endsWith(orderPhone)

    let numberMatches = false
    if (queryNumber) {
      const idClean = order.id.toLowerCase().replace(/^#|^os-/i, "")
      numberMatches =
        idClean === queryNumber ||
        idClean.slice(-8) === queryNumber ||
        order.id.toLowerCase() === query.number?.trim().toLowerCase()
    }

    return phoneMatches || numberMatches
  })

  if (verifiedOrders.length === 0) {
    return null
  }

  // Máximo 3 pedidos más recientes
  const topOrders = verifiedOrders.slice(0, 3)

  const trackingPort = getShippingTrackingAdapter()

  const formattedOrders: AssistantOrderDTO[] = await Promise.all(
    topOrders.map(async (order) => {
      const orderNumber = order.id.startsWith("OS-")
        ? order.id
        : `OS-${order.id.slice(-8).toUpperCase()}`

      const itemsSummary = order.items
        .map((item) =>
          item.variant
            ? `${item.product.name}, talla ${item.variant.size}`
            : item.product.name
        )
        .join("; ")

      const hasTracking = Boolean(order.trackingNumber)
      const carrierLabel = hasTracking
        ? order.carrier === "OTHER"
          ? "Otra"
          : "Envía"
        : null

      let tracking: TrackingEvent | null = null
      let trackingUrl: string | null = null

      if (hasTracking && order.trackingNumber) {
        trackingUrl = trackingPort.buildTrackingUrl(order.trackingNumber)
        // Solo intentar seguimiento en vivo con Envía o sin carrier específico
        if (order.carrier === "ENVIA" || !order.carrier) {
          tracking = await trackingPort.getTracking(order.trackingNumber)
        }
      }

      const isDeliveredOrCancelled =
        order.status === "DELIVERED" || order.status === "CANCELLED"
      const eta = isDeliveredOrCancelled ? null : "3 a 5 días hábiles"

      return {
        number: orderNumber,
        createdAt: order.createdAt.toISOString().slice(0, 10),
        status: mapOrderStatusToClient(order.status),
        items: itemsSummary,
        carrier: carrierLabel,
        trackingNumber: order.trackingNumber ?? null,
        tracking,
        trackingUrl,
        eta,
      }
    })
  )

  return { orders: formattedOrders }
}
