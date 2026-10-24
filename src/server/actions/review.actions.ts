"use server"

import { headers } from "next/headers"
import { consumePublicRateLimit } from "@/server/services/public-rate-limit.service"
import { auth } from "@/lib/auth"
import { submitProductReview } from "@/server/services/review.service"
import { revalidatePath } from "next/cache"

export async function submitReviewAction(formData: FormData) {
  const reqHeaders = await headers()
  const rateLimit = await consumePublicRateLimit("product-review", reqHeaders, {
    max: 5,
    windowMs: 10 * 60 * 1_000,
  })
  if (!rateLimit.allowed) {
    return { ok: false, error: "Demasiadas reseñas. Intenta de nuevo más tarde." }
  }

  const productId = formData.get("productId") as string
  const rating = Number(formData.get("rating"))
  const title = formData.get("title") as string | null
  const body = formData.get("body") as string

  // SEGURIDAD: la identidad NUNCA se toma del cliente. Si hay sesión, la reseña
  // se vincula al usuario autenticado y usa su nombre real; si no, es anónima
  // (nombre de invitado) y no se asocia a ninguna cuenta. Así no se puede
  // suplantar a otro usuario registrado enviando un userId arbitrario.
  const session = await auth.api.getSession({ headers: reqHeaders })
  const userId = session?.user?.id
  const sessionName = session?.user?.name?.trim()
  const guestName = (formData.get("userName") as string | null)?.trim()
  const userName = sessionName || guestName || ""

  try {
    await submitProductReview({
      productId,
      userId: userId || undefined,
      userName,
      rating,
      title: title || undefined,
      body,
    })
    revalidatePath("/productos/[slug]", "page")
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al enviar reseña"
    return { ok: false, error: message }
  }
}
