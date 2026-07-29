"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/server/auth/require-admin"
import { productColorSchema } from "@/server/validators/product-color.validator"
import {
  createProductColor,
  updateProductColor,
  deleteProductColor,
} from "@/server/services/product-color.service"

interface ActionResult {
  success: boolean
  error?: string
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido."
}

/** Revalida las superficies donde se muestran colores (admin y filtros de tienda). */
function revalidateColorSurfaces(): void {
  revalidatePath("/admin/colores")
  revalidatePath("/admin/productos", "layout")
  revalidatePath("/productos")
}

export async function createColorAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const parsed = productColorSchema.safeParse({
      name: formData.get("name"),
      hex: formData.get("hex"),
      isActive: formData.get("isActive") === "false" ? false : true,
    })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
    }

    await createProductColor(parsed.data)
    revalidateColorSurfaces()
    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateColorAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const parsed = productColorSchema.safeParse({
      name: formData.get("name"),
      hex: formData.get("hex"),
      isActive: formData.get("isActive") === "false" ? false : true,
    })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
    }

    await updateProductColor(id, parsed.data)
    revalidateColorSurfaces()
    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function deleteColorAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    await deleteProductColor(id)
    revalidateColorSurfaces()
    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}
