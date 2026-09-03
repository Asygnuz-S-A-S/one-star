"use server"

import { revalidatePath } from "next/cache"
import { createBrand, updateBrand, deleteBrand } from "@/server/services/brand.service"
import { requireAdmin } from "@/server/auth/require-admin"
import type { ActionResult } from "@/types/admin"

export async function createBrandAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const name = (formData.get("name") as string)?.trim()
    const logoUrl = (formData.get("logoUrl") as string)?.trim() || null
    const isActive = formData.get("isActive") !== "false"

    if (!name) return { success: false, error: "El nombre es requerido." }

    const brand = await createBrand({ name, logoUrl, isActive })
    revalidatePath("/admin/marcas")
    revalidatePath("/admin/productos")
    return { success: true, id: brand.id }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "Ya existe una marca con ese nombre o slug." }
    }
    return { success: false, error: "Error al crear la marca." }
  }
}

export async function updateBrandAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const name = (formData.get("name") as string)?.trim()
    const logoUrl = (formData.get("logoUrl") as string)?.trim() || null
    const isActive = formData.get("isActive") !== "false"

    if (!name) return { success: false, error: "El nombre es requerido." }

    await updateBrand(id, { name, logoUrl, isActive })
    revalidatePath("/admin/marcas")
    revalidatePath("/admin/productos")
    revalidatePath("/")
    return { success: true, id }
  } catch (error) {
    console.error("[updateBrandAction] Error:", error)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "Ya existe una marca con ese nombre o slug." }
    }
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar la marca." }
  }
}

export async function deleteBrandAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    await deleteBrand(id)
    revalidatePath("/admin/marcas")
    revalidatePath("/admin/productos")
    return { success: true }
  } catch {
    return { success: false, error: "La marca tiene productos asociados o no existe." }
  }
}
