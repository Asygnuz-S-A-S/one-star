import { z } from "zod"

export const requestRecoverySchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("El formato de correo no es válido")
    .max(120, "El correo no debe superar 120 caracteres"),
})

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "El token es obligatorio"),
  password: z
    .string()
    .min(10, "La contraseña debe tener al menos 10 caracteres")
    .max(80, "La contraseña no debe superar 80 caracteres"),
})

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
  newPassword: z
    .string()
    .min(10, "La nueva contraseña debe tener al menos 10 caracteres")
    .max(80, "La contraseña no debe superar 80 caracteres"),
})

export type RequestRecoveryInput = z.infer<typeof requestRecoverySchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>
