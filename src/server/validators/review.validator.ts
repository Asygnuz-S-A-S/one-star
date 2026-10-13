import { z } from "zod"

export const editReviewSchema = z.object({
  id: z.string().min(1, "ID de reseña requerido"),
  userName: z.string().trim().min(1, "El nombre es requerido").max(80),
  rating: z.coerce.number().int().min(1, "Mínimo 1 estrella").max(5, "Máximo 5 estrellas"),
  title: z.string().trim().max(120).optional().nullable(),
  body: z.string().trim().min(1, "El comentario no puede estar vacío").max(2000),
  verified: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
})

export type EditReviewInput = z.infer<typeof editReviewSchema>
