"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/server/auth/require-admin"
import { createAdminReview, moderateReview, removeReview } from "@/server/services/review.service"

interface ReviewActionResult {
  success: boolean
  error?: string
}

function refresh() {
  revalidatePath("/admin/resenas")
  revalidatePath("/productos/[slug]", "page")
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error inesperado"
}

export async function moderateReviewAction(id: string, isApproved: boolean): Promise<ReviewActionResult> {
  try {
    await requireAdmin()
    await moderateReview(id, isApproved)
    refresh()
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function deleteReviewAction(id: string): Promise<ReviewActionResult> {
  try {
    await requireAdmin()
    await removeReview(id)
    refresh()
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) }
  }
}

/** Carga una reseña propia (testimonio recibido por otro canal). Se publica de inmediato. */
export async function createReviewAction(formData: FormData): Promise<ReviewActionResult> {
  try {
    await requireAdmin()
    const productId = String(formData.get("productId") ?? "")
    if (!productId) return { success: false, error: "Elige el producto de la reseña." }
    await createAdminReview({
      productId,
      userName: String(formData.get("userName") ?? ""),
      rating: Number(formData.get("rating")),
      title: String(formData.get("title") ?? "").trim() || undefined,
      body: String(formData.get("body") ?? ""),
      verified: formData.get("verified") === "on",
    })
    refresh()
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error) }
  }
}
