"use server"

import { 
  addStoreLogo, 
  deleteStoreLogo, 
  setPrimaryStoreLogo, 
  updateStoreLogoTheme
} from "@/server/repositories/site-logo.repository"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/server/auth/require-admin"

export async function addStoreLogoAction(data: {
  url: string
  fileName?: string
  type: string
  theme: string
  isPrimary: boolean
}) {
  try {
    await requireAdmin()
    const newLogo = await addStoreLogo(data)
    if (data.isPrimary) {
      revalidatePath("/", "layout")
    }
    return { success: true, data: newLogo }
  } catch (error: unknown) {
    console.error("Error adding store logo:", error)
    const message = error instanceof Error ? error.message : "Error al subir logo"
    return { success: false, error: message }
  }
}

export async function setPrimaryStoreLogoAction(id: string, type: string) {
  try {
    await requireAdmin()
    await setPrimaryStoreLogo(id, type)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: unknown) {
    console.error("Error setting primary logo:", error)
    const message = error instanceof Error ? error.message : "Error al establecer logo principal"
    return { success: false, error: message }
  }
}

export async function updateStoreLogoThemeAction(id: string, theme: string) {
  try {
    await requireAdmin()
    await updateStoreLogoTheme(id, theme)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: unknown) {
    console.error("Error updating logo theme:", error)
    const message = error instanceof Error ? error.message : "Error al cambiar el tema"
    return { success: false, error: message }
  }
}

export async function deleteStoreLogoAction(id: string) {
  try {
    await requireAdmin()
    await deleteStoreLogo(id)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: unknown) {
    console.error("Error deleting store logo:", error)
    const message = error instanceof Error ? error.message : "Error al eliminar logo"
    return { success: false, error: message }
  }
}
