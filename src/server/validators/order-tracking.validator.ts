import "server-only"
import { z } from "zod"

/** Número corto que ve el cliente: los últimos 8 caracteres del id, con o sin "#" u "OS-". */
export const orderTrackingSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .transform((value) => value.replace(/^#|^os-/i, "").toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{8}$/, "El número de pedido tiene 8 letras y números, por ejemplo #O823F4TY")),
  email: z.string().trim().toLowerCase().email("Ingresa el correo con el que hiciste la compra").max(120),
})

export type OrderTrackingInput = z.infer<typeof orderTrackingSchema>
