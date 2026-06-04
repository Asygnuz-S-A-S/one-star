import { z } from "zod"

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(7),
  cedula: z.string().min(5),
  birthDate: z.string().datetime().optional(),
  preferredBrand: z.string().optional(),
  gender: z.string().optional(),
})

export type CreateUserDTO = z.infer<typeof createUserSchema>

export const updateUserSchema = createUserSchema.partial().omit({ password: true })

export type UpdateUserDTO = z.infer<typeof updateUserSchema>
