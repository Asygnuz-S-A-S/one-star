import { z } from "zod"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null))

export const storeLocationSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  address: z.string().trim().min(1, "La dirección es obligatoria.").max(200),
  city: z.string().trim().min(1, "La ciudad es obligatoria.").max(120),
  phone: optionalText(40),
  schedule: optionalText(200),
  googleMapsUrl: optionalText(500),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  isActive: z.boolean(),
  /** UUID del establecimiento en el ERP; vacío o null = sede sin vínculo. */
  erpId: optionalText(120),
})

export type StoreLocationInput = z.infer<typeof storeLocationSchema>
