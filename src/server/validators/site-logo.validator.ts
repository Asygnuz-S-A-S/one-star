import "server-only"
import { z } from "zod"
import { isSafePublicUrl } from "@/lib/safe-url"

export const StoreLogoInputSchema = z.object({
  url: z.string().trim().min(1, "La imagen es obligatoria")
    .refine(isSafePublicUrl, "Usa una ruta interna o una URL http/https"),
  fileName: z.string().trim().max(255).optional(),
  type: z.enum(["desktop", "mobile", "large", "favicon"]),
  theme: z.enum(["light", "dark", "any"]),
  isPrimary: z.boolean(),
})

export const StoreLogoThemeSchema = z.enum(["light", "dark", "any"])
export const StoreLogoTypeSchema = z.enum(["desktop", "mobile", "large", "favicon"])

export type StoreLogoInput = z.infer<typeof StoreLogoInputSchema>
