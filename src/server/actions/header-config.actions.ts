"use server"

import { updateHeaderConfig } from "@/server/repositories/header-config.repository"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/server/auth/require-admin"

export async function updateHeaderConfigAction(data: {
  layout: string
  navAlignment: string
  showSearch: boolean
  showCart: boolean
  showUser: boolean
  bgColor: string
  textColor: string
  hasBorderBottom: boolean
  bgOpacity: number
  useBlur: boolean
  margin: string
  padding: string
  borderRadius: string
}) {
  try {
    await requireAdmin()
    // El caller puede pasar el registro completo; se descartan campos de solo lectura
    const { id: _id, updatedAt: _updatedAt, ...safeData } =
      data as typeof data & { id?: string; updatedAt?: Date }
    void _id
    void _updatedAt
    const config = await updateHeaderConfig(safeData)
    revalidatePath("/", "layout")
    return { success: true, data: config }
  } catch (error: unknown) {
    console.error("Error updating header config:", error)
    const message = error instanceof Error ? error.message : "Error al actualizar el header"
    return { success: false, error: message }
  }
}
