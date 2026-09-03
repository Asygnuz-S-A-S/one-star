import "server-only"
import { z } from "zod"

export const HeaderConfigInputSchema = z.object({
  layout: z.enum(["logo-left-nav-center", "logo-center-nav-left"]),
  navAlignment: z.enum(["left", "center", "right"]),
  showSearch: z.boolean(),
  showCart: z.boolean(),
  showUser: z.boolean(),
  bgColor: z.string().trim().min(1).max(32),
  textColor: z.string().trim().min(1).max(32),
  hasBorderBottom: z.boolean(),
  bgOpacity: z.number().int().min(0).max(100),
  useBlur: z.boolean(),
  margin: z.string().trim().max(80),
  padding: z.string().trim().max(80),
  borderRadius: z.string().trim().max(80),
})

export type HeaderConfigInput = z.infer<typeof HeaderConfigInputSchema>
