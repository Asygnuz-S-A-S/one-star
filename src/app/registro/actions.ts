"use server"

import { registerUser, emailExists } from "@/server/services/user.service"
import { createUserSchema } from "@/server/validators/user.validator"

export async function registerCustomer(
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  const parsed = createUserSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos." }
  }

  const exists = await emailExists(parsed.data.email)
  if (exists) {
    return { success: false, error: "Este correo ya está registrado." }
  }

  await registerUser(parsed.data)
  return { success: true }
}
