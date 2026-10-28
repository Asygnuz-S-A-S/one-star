"use server"

import { revalidatePath } from "next/cache"
import { updatePqrsStatus } from "@/server/services/pqrs.service"
import { requireAdmin } from "@/server/auth/require-admin"
import type { PqrsStatus } from "@prisma/client"

export async function updatePqrsStatusAction(
  id: string,
  status: PqrsStatus,
  responseNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    await updatePqrsStatus(id, {
      status,
      responseNotes: responseNotes?.trim() || null,
    })
    revalidatePath("/admin/pqrs")
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al actualizar estado",
    }
  }
}
