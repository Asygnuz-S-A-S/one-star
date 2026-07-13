"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { submitProductReview } from "@/server/services/review.service"
import { revalidatePath } from "next/cache"

/** Rate limiting en memoria por IP (se reinicia al reiniciar el proceso). */
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 10 * 60 * 1000 // 10 minutos
const MAX_REVIEWS = 5

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = attempts.get(ip)
  if (record && now < record.resetAt) {
    if (record.count >= MAX_REVIEWS) return true
    record.count++
    return false
  }
  attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  return false
}

export async function submitReviewAction(formData: FormData) {
  const reqHeaders = await headers()
  const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (isRateLimited(ip)) {
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
    revalidatePath(`/productos/[slug]`)
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al enviar reseña"
    return { ok: false, error: message }
  }
}
