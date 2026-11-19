import { z } from "zod"

/**
 * El navegador solo manda dónde estuvo. El tipo de evento, la categoría y los
 * filtros los deduce el servidor: nada de lo que llega aquí se usa como
 * verdad, y todo va recortado porque el endpoint es público.
 */
export const trackHitSchema = z.object({
  path: z.string().trim().min(1).max(500),
  query: z.string().max(1000).optional(),
  referrer: z.string().max(500).nullish(),
})

export type TrackHitPayload = z.infer<typeof trackHitSchema>
