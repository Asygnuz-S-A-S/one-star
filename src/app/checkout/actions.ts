"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { placeOrder } from "@/server/services/order.service"
import type { EpaycoCheckoutData } from "@/components/checkout/EpaycoButton"

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
  /** Datos para inicializar el checkout de ePayco en el cliente */
  epaycoData?: EpaycoCheckoutData
  error?: string
}

export async function createOrder(data: CheckoutData): Promise<CreateOrderResult> {
  if (!data.items || data.items.length === 0) {
    return { success: false, error: "El carrito está vacío" }
  }

  try {
    const session = await auth.api.getSession({ headers: await headers() })
    const userId = session?.user?.id ?? null

    const order = await placeOrder(userId, {
      total: data.total,
      customerEmail: data.email,
      customerName: `${data.name} ${data.lastName}`,
      paymentMethod: data.paymentMethod,
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
        variantId: item.variantId,
        sku: item.sku,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    })

    const epaycoData: EpaycoCheckoutData = {
      orderId: order.id,
      amount: data.total,
      customerEmail: data.email,
      customerName: data.name,
      customerLastName: data.lastName,
      phone: data.phone,
      address: data.address,
      city: data.city,
      department: data.department,
    }

    return { success: true, orderId: order.id, epaycoData }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[createOrder]", message)
    }
    const isStockError = message.startsWith("Stock insuficiente")
    return {
      success: false,
      error: isStockError ? message : "Error al procesar el pedido",
    }
  }
}
