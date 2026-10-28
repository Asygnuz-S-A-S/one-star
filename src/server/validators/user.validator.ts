import { z } from "zod"

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(7),
  cedula: z
    .string()
    .trim()
    .regex(/^[0-9]{6,12}$/, "La cédula debe tener entre 6 y 12 dígitos numéricos"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)").optional(),
  preferredBrand: z.string().optional(),
  gender: z.string().optional(),
  /** Unirse a One Star Club al crear la cuenta. */
  joinClub: z.boolean().optional(),
  /** Consentimiento explícito para el newsletter. */
  newsletter: z.boolean().optional(),
})

export type CreateUserDTO = z.infer<typeof createUserSchema>

export const updateUserSchema = createUserSchema.partial().omit({ password: true, joinClub: true, newsletter: true })

export type UpdateUserDTO = z.infer<typeof updateUserSchema>
