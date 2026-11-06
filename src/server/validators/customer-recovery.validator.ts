import "server-only"
import { z } from "zod"

export const customerRecoveryEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido").max(120),
})

// Mismo mínimo que el registro de clientes (user.validator: 8 caracteres).
export const customerResetPasswordSchema = z.object({
  token: z.string().trim().min(1, "El enlace no es válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(80, "La contraseña no debe superar 80 caracteres"),
})
