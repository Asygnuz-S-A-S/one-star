"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { placeOrder } from "@/server/services/order.service"
import { checkoutSchema } from "@/server/validators/checkout.validator"
import type { EpaycoCheckoutData } from "@/components/checkout/EpaycoButton"

interface CheckoutItem {
  productId: string
  variantId: string
  sku: string
  name: string
  quantity: number
  /** Solo informativo — el servidor recalcula el precio real desde la BD */
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
  /** Solo informativos — el servidor los ignora y recalcula (ver order.service) */
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
  // Validación server-side con Zod: nunca confiar en la validación del cliente.
  const parsed = checkoutSchema.safeParse(data)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return {
      success: false,
      error: firstIssue ? firstIssue.message : "Datos de pedido inválidos",
    }
  }
  const input = parsed.data

  try {
    const session = await auth.api.getSession({ headers: await headers() })
    const userId = session?.user?.id ?? null

    // SEGURIDAD: no se envían precios — placeOrder los resuelve desde la BD
    // y calcula subtotal, envío y total en el servidor.
    const order = await placeOrder(userId, {
      customerEmail: input.email,
      customerName: `${input.name} ${input.lastName}`,
      paymentMethod: input.paymentMethod,
      shippingMethod: input.shippingMethod,
      shippingAddress: {
        phone: input.phone,
        address: input.address,
        apartment: input.apartment ?? null,
        city: input.city,
        department: input.department,
        postalCode: input.postalCode ?? null,
      },
      items: input.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        sku: item.sku,
        productName: item.name,
        quantity: item.quantity,
      })),
    })

    const epaycoData: EpaycoCheckoutData = {
      orderId: order.id,
      // El monto a cobrar es el total calculado en servidor, no el del cliente.
      amount: order.total,
      customerEmail: input.email,
      customerName: input.name,
      customerLastName: input.lastName,
      phone: input.phone,
      address: input.address,
      city: input.city,
      department: input.department,
    }

    return { success: true, orderId: order.id, epaycoData }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[createOrder]", message)
    }
    const isCustomerFacing =
      message.startsWith("Stock") ||
      message.includes("ya no está disponible") ||
      message.includes("se agotó")
    return {
      success: false,
      error: isCustomerFacing ? message : "Error al procesar el pedido",
    }
  }
}
