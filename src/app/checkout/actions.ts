"use server"

import "server-only"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/server/db/prisma"
import { placeOrder } from "@/server/services/order.service"
import { markCartsRecoveredForEmail } from "@/server/services/abandoned-cart.service"
import { getUserById } from "@/server/services/user.service"
import { checkoutSchema } from "@/server/validators/checkout.validator"
import { consumePublicRateLimit } from "@/server/services/public-rate-limit.service"
import { signGuestOrderSuccessToken } from "@/server/services/guest-order.service"
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
  documentType?: "CC" | "CE" | "NIT" | "PP"
  cedula: string
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
  /** Código de cupón aplicado; el servidor lo revalida y recalcula el descuento */
  couponCode?: string
  termsAccepted?: boolean
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
  code?: "AUTH_REQUIRED" | "VALIDATION_ERROR" | "ORDER_ERROR"
}

export async function createOrder(data: CheckoutData): Promise<CreateOrderResult> {
  try {
    const reqHeaders = await headers()
    const session = await auth.api.getSession({ headers: reqHeaders })
    const isCustomer = Boolean(session?.user?.id && session.user.userType === "customer")
    const userId = isCustomer && session?.user?.id ? session.user.id : null

    // Si es compra como invitado, aplicamos límites de intentos por IP y por correo
    if (!userId) {
      const ipLimit = await consumePublicRateLimit("guest_order_ip", reqHeaders, {
        max: 15,
        windowMs: 60 * 60 * 1000,
      })
      if (!ipLimit.allowed) {
        return {
          success: false,
          code: "ORDER_ERROR",
          error: "Demasiados intentos de pedido desde esta conexión. Por favor intenta más tarde.",
        }
      }

      if (data.email) {
        const emailLimit = await consumePublicRateLimit("guest_order_email", reqHeaders, {
          max: 5,
          windowMs: 60 * 60 * 1000,
          subject: data.email,
        })
        if (!emailLimit.allowed) {
          return {
            success: false,
            code: "ORDER_ERROR",
            error: "Demasiados intentos de pedido para este correo. Por favor intenta más tarde.",
          }
        }
      }
    }

    // Validación server-side con Zod: nunca confiar en la validación del cliente.
    const parsed = checkoutSchema.safeParse(data)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: firstIssue ? firstIssue.message : "Datos de pedido inválidos",
      }
    }
    const input = parsed.data

    // SEGURIDAD: no se envían precios — placeOrder los resuelve desde la BD
    // y calcula subtotal, envío y total en el servidor.
    const order = await placeOrder(userId, {
      customerEmail: input.email,
      customerName: `${input.name} ${input.lastName}`,
      customerDocumentType: input.documentType,
      customerDocument: input.cedula,
      customerPhone: input.phone,
      paymentMethod: input.paymentMethod,
      shippingMethod: input.shippingMethod,
      couponCode: input.couponCode,
      shippingAddress: {
        documentType: input.documentType,
        cedula: input.cedula,
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

    // Actualiza cédula en el perfil del usuario si no la tenía registrada
    if (userId && input.cedula) {
      prisma.user
        .updateMany({
          where: { id: userId, cedula: null },
          data: { cedula: input.cedula },
        })
        .catch((error: unknown) => {
          console.error("[createOrder] No se pudo guardar la cédula en el perfil:", error)
        })
    }

    // El pedido se creó: los carritos abandonados de este email quedan cerrados.
    // Fire-and-forget: un fallo aquí no debe afectar la compra.
    markCartsRecoveredForEmail(input.email).catch((err) => {
      console.error("[createOrder] No se pudo marcar carrito recuperado:", err)
    })

    const guestToken = !userId ? signGuestOrderSuccessToken(order.id) : undefined

    const epaycoData: EpaycoCheckoutData = {
      orderId: order.id,
      // El monto a cobrar es el total calculado en servidor, no el del cliente.
      amount: order.total,
      customerEmail: input.email,
      customerName: input.name,
      customerLastName: input.lastName,
      cedula: input.cedula,
      phone: input.phone,
      address: input.address,
      city: input.city,
      department: input.department,
      ...(guestToken ? { guestToken } : {}),
    }

    return { success: true, orderId: order.id, epaycoData }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    if (process.env.NODE_ENV === "development") {
      console.error("[createOrder]", message)
    }
    const isCustomerFacing =
      message.startsWith("Stock") ||
      message.includes("ya no está disponible") ||
      message.includes("se agotó") ||
      message.includes("cupón")
    return {
      success: false,
      code: "ORDER_ERROR",
      error: isCustomerFacing ? message : "Error al procesar el pedido",
    }
  }
}

/**
 * Obtiene los datos del perfil del cliente autenticado para autocompletar el formulario de checkout.
 */
export async function getCustomerCheckoutProfile(): Promise<{
  email: string
  name?: string
  lastName?: string
  phone?: string
  cedula?: string
} | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id || session.user.userType !== "customer") return null
  const user = await getUserById(session.user.id)
  if (!user) return null
  return {
    email: user.email,
    name: user.name ?? undefined,
    lastName: user.lastName ?? undefined,
    phone: user.phone ?? undefined,
    cedula: user.cedula ?? undefined,
  }
}

