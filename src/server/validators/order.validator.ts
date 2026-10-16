import "server-only"
import { z } from "zod"

/** Datos de contacto y envío editables desde el detalle del pedido en el admin. */
export const orderCustomerDataSchema = z.object({
  customerName: z.string().trim().min(1, "El nombre es requerido").max(240),
  customerEmail: z.string().trim().email("Ingresa un email válido"),
  phone: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^[0-9]{7,15}$/, "Ingresa un teléfono válido (solo números)")),
  address: z.string().trim().min(1, "La dirección es requerida").max(300),
  apartment: z.string().trim().max(120).optional(),
  city: z.string().trim().min(1, "La ciudad es requerida").max(120),
  department: z.string().trim().min(1, "El departamento es requerido").max(120),
  postalCode: z.string().trim().max(20).optional(),
})

export type OrderCustomerDataInput = z.infer<typeof orderCustomerDataSchema>
