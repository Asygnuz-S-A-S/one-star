"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/server/auth/require-admin"
import {
  createCategoryFromAdmin,
  deleteCategoryFromAdmin,
  updateCategoryFromAdmin,
} from "@/server/services/category.service"
import { categoryIdSchema, categoryInputSchema } from "@/server/validators/category.validator"

function revalidateCategories() {
  revalidatePath("/admin/categorias")
  revalidatePath("/")
}

export async function createCategoryAction(name: string, slug: string) {
  try {
    await requireAdmin("inventory")
    const parsed = categoryInputSchema.safeParse({ name, slug })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }

    const result = await createCategoryFromAdmin(parsed.data)
    if (result.success) revalidateCategories()
    return result
  } catch (error) {
    console.error("Error creating category:", error)
    return { success: false, error: "Error al crear la categoría" }
  }
}

export async function updateCategoryAction(id: string, name: string, slug: string) {
  try {
    await requireAdmin("inventory")
    const parsedId = categoryIdSchema.safeParse(id)
    const parsed = categoryInputSchema.safeParse({ name, slug })
    if (!parsedId.success) {
      return { success: false, error: parsedId.error.issues[0]?.message ?? "Datos inválidos" }
    }
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
    }

    const result = await updateCategoryFromAdmin(parsedId.data, parsed.data)
    if (result.success) revalidateCategories()
    return result
  } catch (error) {
    console.error("Error updating category:", error)
    return { success: false, error: "Error al actualizar la categoría" }
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    await requireAdmin("inventory")
    const parsedId = categoryIdSchema.safeParse(id)
    if (!parsedId.success) return { success: false, error: parsedId.error.issues[0]?.message ?? "Datos inválidos" }

    const result = await deleteCategoryFromAdmin(parsedId.data)
    if (result.success) revalidateCategories()
    return result
  } catch (error) {
    console.error("Error deleting category:", error)
    return { success: false, error: "Error al eliminar la categoría" }
  }
}
