import { z } from "zod"

export const customerRecoveryRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("El formato de correo no es válido").max(120),
})

export const customerResetSchema = z.object({
  token: z.string().trim().min(1, "Falta el enlace de recuperación."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(80, "La contraseña no debe superar 80 caracteres."),
})
