import "server-only"
import { z } from "zod"
import { isSafePublicUrl } from "@/lib/safe-url"

export const NavigationItemInputSchema = z.object({
  label: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  href: z.string().trim().min(1, "La URL es obligatoria").max(500)
    .refine(isSafePublicUrl, "Usa una ruta interna o una URL http/https"),
  isSale: z.boolean().default(false),
})

export const NavigationPositionsSchema = z.array(
  z.object({
    id: z.string().min(1),
    position: z.number().int().nonnegative(),
  })
).superRefine((updates, context) => {
  const ids = new Set<string>()
  const positions = new Set<number>()

  updates.forEach((update, index) => {
    if (ids.has(update.id)) {
      context.addIssue({ code: "custom", message: "El enlace está repetido", path: [index, "id"] })
    }
    if (positions.has(update.position)) {
      context.addIssue({ code: "custom", message: "La posición está repetida", path: [index, "position"] })
    }
    ids.add(update.id)
    positions.add(update.position)
  })
})

export type NavigationItemInput = z.infer<typeof NavigationItemInputSchema>
