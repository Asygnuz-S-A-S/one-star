"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { updateProfile as updateProfileService } from "@/server/services/user.service"
import { updateUserSchema } from "@/server/validators/user.validator"

export async function updateProfile(
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "No autenticado." }
  }

  const parsed = updateUserSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos." }
  }

  await updateProfileService(session.user.id, parsed.data)
  revalidatePath("/cuenta")
  return { success: true }
}
