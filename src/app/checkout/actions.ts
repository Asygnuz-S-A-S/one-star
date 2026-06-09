"use server"

import { placeOrder } from "@/server/services/order.service"

// TODO: Integrar ePayco API - https://epayco.com/docs/
// TODO: Integrar Mercadopago SDK - https://www.mercadopago.com.co/developers/es/docs
// TODO: Integrar Addi checkout - https://developers.addi.com/

interface CheckoutItem {
  productId: string
  variantId: string
  sku: string
  name: string
  quantity: number
  unitPrice: number
}

export interface CheckoutData {
  email: string
  name: string
  lastName: string
  phone: string
  address: string
  apartment?: string
  city: string
  department: string
  postalCode?: string
  shippingMethod: "standard" | "express"
  paymentMethod: "epayco" | "mercadopago" | "addi"
  items: CheckoutItem[]
  subtotal: number
  shippingCost: number
  total: number
}

interface CreateOrderResult {
  success: boolean
  orderId?: string
  redirectUrl?: string
  error?: string
}

export async function createOrder(data: CheckoutData): Promise<CreateOrderResult> {
  if (!data.items || data.items.length === 0) {
    return { success: false, error: "El carrito está vacío" }
  }

  try {
    const order = await placeOrder(null, {
      total: data.total,
      customerEmail: data.email,
      customerName: `${data.name} ${data.lastName}`,
      shippingAddress: {
        phone: data.phone,
        address: data.address,
        apartment: data.apartment ?? null,
        city: data.city,
        department: data.department,
        postalCode: data.postalCode ?? null,
        shippingMethod: data.shippingMethod,
        shippingCost: data.shippingCost,
      },
      items: data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))
    })

    return { success: true, orderId: order.id }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    // In production replace with structured logger (e.g., pino)
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[createOrder]", message)
    }
    return { success: false, error: "Error al procesar el pedido" }
  }

}
