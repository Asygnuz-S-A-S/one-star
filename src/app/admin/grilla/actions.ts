"use server"

import { revalidatePath } from "next/cache"
import {
  createGridBlock as createGridBlockService,
  updateGridBlock as updateGridBlockService,
  deleteGridBlock as deleteGridBlockService,
  updateGridBlocksPositions,
} from "@/server/services/home-grid.service"

function parseForm(formData: FormData) {
  return {
    label: formData.get("label") as string,
    href: formData.get("href") as string,
    bgColor: formData.get("bgColor") as string,
    emoji: (formData.get("emoji") as string) || null,
    darkText: formData.get("darkText") === "true",
    position: parseInt(formData.get("position") as string) || 0,
    isActive: formData.get("isActive") === "true",
  }
}

export async function createGridBlock(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const input = parseForm(formData)
  if (!input.label || !input.href || !input.bgColor) {
    return { success: false, error: "Texto, enlace y color son obligatorios." }
  }
  try {
    await createGridBlockService(input)
    revalidatePath("/admin/grilla")
    revalidatePath("/") // revalidate storefront
    return { success: true }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[createGridBlock]", error)
    }
    return { success: false, error: "Error al crear el bloque." }
  }
}

export async function updateGridBlock(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const input = parseForm(formData)
  try {
    await updateGridBlockService(id, input)
    revalidatePath("/admin/grilla")
    revalidatePath("/")
    return { success: true }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[updateGridBlock]", error)
    }
    return { success: false, error: "Error al actualizar el bloque." }
  }
}

export async function deleteGridBlock(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteGridBlockService(id)
    revalidatePath("/admin/grilla")
    revalidatePath("/")
    return { success: true }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[deleteGridBlock]", error)
    }
    return { success: false, error: "Error al eliminar el bloque." }
  }
}

export async function toggleGridBlockActive(
  id: string,
  current: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateGridBlockService(id, { isActive: !current })
    revalidatePath("/admin/grilla")
    revalidatePath("/")
    return { success: true }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[toggleGridBlockActive]", error)
    }
    return { success: false, error: "Error al cambiar el estado." }
  }
}
