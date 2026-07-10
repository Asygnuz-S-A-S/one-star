"use server"

import { 
  addStoreLogo, 
  deleteStoreLogo, 
  setPrimaryStoreLogo, 
  updateStoreLogoTheme
} from "@/server/repositories/site-logo.repository"
import { revalidatePath } from "next/cache"

export async function addStoreLogoAction(data: {
  url: string
  fileName?: string
  type: string
  theme: string
  isPrimary: boolean
}) {
  try {
    const newLogo = await addStoreLogo(data)
    if (data.isPrimary) {
      revalidatePath("/", "layout")
    }
    return { success: true, data: newLogo }
  } catch (error: any) {
    console.error("Error adding store logo:", error)
    return { success: false, error: error.message || "Error al subir logo" }
  }
}

export async function setPrimaryStoreLogoAction(id: string, type: string) {
  try {
    await setPrimaryStoreLogo(id, type)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: any) {
    console.error("Error setting primary logo:", error)
    return { success: false, error: error.message || "Error al establecer logo principal" }
  }
}

export async function updateStoreLogoThemeAction(id: string, theme: string) {
  try {
    await updateStoreLogoTheme(id, theme)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: any) {
    console.error("Error updating logo theme:", error)
    return { success: false, error: error.message || "Error al cambiar el tema" }
  }
}

export async function deleteStoreLogoAction(id: string) {
  try {
    await deleteStoreLogo(id)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting store logo:", error)
    return { success: false, error: error.message || "Error al eliminar logo" }
  }
}
