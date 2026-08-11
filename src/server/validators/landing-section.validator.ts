import "server-only"
import { LandingSectionType } from "@prisma/client"
import { z } from "zod"

export const LandingSectionTypeSchema = z.enum(LandingSectionType)

export const LandingSectionPositionsSchema = z.array(
  z.object({
    id: z.string().min(1),
    position: z.number().int().nonnegative(),
  })
).superRefine((updates, context) => {
  const ids = new Set<string>()
  const positions = new Set<number>()

  updates.forEach((update, index) => {
    if (ids.has(update.id)) {
      context.addIssue({ code: "custom", message: "La sección está repetida", path: [index, "id"] })
    }
    if (positions.has(update.position)) {
      context.addIssue({ code: "custom", message: "La posición está repetida", path: [index, "position"] })
    }
    ids.add(update.id)
    positions.add(update.position)
  })
})

export const LandingSectionConfigSchema = z.record(z.string(), z.unknown())
