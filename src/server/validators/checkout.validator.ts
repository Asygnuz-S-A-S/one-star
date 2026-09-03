import "server-only"
import { z } from "zod"

/**
 * Validación server-side del payload de checkout.
 * Los campos de precio (unitPrice, subtotal, total…) NO se validan aquí
 * porque el servidor los ignora y los recalcula desde la base de datos.
 */
export const checkoutItemSchema = z.object({
  productId: z.string().min(1, "productId requerido"),
  variantId: z.string().min(1, "variantId requerido"),
  sku: z.string().min(1, "sku requerido"),
  name: z.string().min(1),
  quantity: z.number().int().positive().max(50),
})

export const checkoutSchema = z.object({
  email: z.string().trim().email("Ingresa un email válido"),
  name: z.string().trim().min(1, "El nombre es requerido").max(120),
  lastName: z.string().trim().min(1, "El apellido es requerido").max(120),
  phone: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^[0-9]{7,15}$/, "Ingresa un teléfono válido (solo números)")),
  address: z.string().trim().min(1, "La dirección es requerida").max(300),
  apartment: z.string().trim().max(120).optional(),
  city: z.string().trim().min(1, "La ciudad es requerida").max(120),
  department: z.string().trim().min(1, "El departamento es requerido").max(120),
  postalCode: z.string().trim().max(20).optional(),
  shippingMethod: z.enum(["standard", "express"]),
  paymentMethod: z.enum(["epayco", "mercadopago", "addi"]),
  couponCode: z.string().trim().max(40).optional(),
  items: z.array(checkoutItemSchema).min(1, "El carrito está vacío").max(100),
})

export type ValidatedCheckout = z.infer<typeof checkoutSchema>
