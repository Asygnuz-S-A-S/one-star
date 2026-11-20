import { z } from "zod"

/** Debe coincidir con `META_CATALOG_MAX_ITEMS` del servicio. */
const MAX_ITEMS = 5000

export const metaCatalogQuerySchema = z.object({
  /** Solo se exige cuando `META_CATALOG_TOKEN` está configurada. */
  token: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().positive().max(MAX_ITEMS).optional(),
})

export type MetaCatalogQuery = z.infer<typeof metaCatalogQuerySchema>
