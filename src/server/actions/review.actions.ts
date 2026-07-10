"use server"

import { submitProductReview } from "@/server/services/review.service"
import { revalidatePath } from "next/cache"

export async function submitReviewAction(formData: FormData) {
  const productId = formData.get("productId") as string
  const userId = formData.get("userId") as string | null
  const userName = formData.get("userName") as string
  const rating = Number(formData.get("rating"))
  const title = formData.get("title") as string | null
  const body = formData.get("body") as string

  try {
    await submitProductReview({
      productId,
      userId: userId || undefined,
      userName,
      rating,
      title: title || undefined,
      body,
    })
    revalidatePath(`/productos/[slug]`)
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message ?? "Error al enviar reseña" }
  }
}
