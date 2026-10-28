import { NextResponse } from "next/server"
import {
  authenticateAssistantRequest,
  checkOrderRateLimits,
  recordOrderFailedAttempt,
} from "@/server/services/assistant-auth.service"
import { assistantOrderQuerySchema } from "@/server/validators/assistant.validator"
import { searchAssistantOrders } from "@/server/services/assistant.service"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const auth = await authenticateAssistantRequest(request)
  if (!auth.authorized) {
    return auth.response
  }

  const { searchParams } = new URL(request.url)
  const rawParams = {
    cedula: searchParams.get("cedula") ?? undefined,
    waPhone: searchParams.get("waPhone") ?? undefined,
    number: searchParams.get("number") ?? undefined,
  }

  const parsed = assistantOrderQuerySchema.safeParse(rawParams)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const { cedula, waPhone } = parsed.data

  // Verificar límite estricto de intentos fallidos (5 por hora por IP, cédula y waPhone)
  const rateLimitStatus = await checkOrderRateLimits(request.headers, cedula, waPhone)
  if (rateLimitStatus.blocked) {
    return NextResponse.json(
      { error: "Demasiados intentos fallidos. Intenta más tarde." },
      {
        status: 429,
        headers: rateLimitStatus.retryAfterSeconds
          ? { "Retry-After": String(rateLimitStatus.retryAfterSeconds) }
          : undefined,
      }
    )
  }

  const result = await searchAssistantOrders(parsed.data)

  // Si no hay pedidos verificados que cumplan la regla, registrar intento fallido y responder 404 idéntico
  if (!result || result.orders.length === 0) {
    await recordOrderFailedAttempt(request.headers, cedula, waPhone)
    return NextResponse.json(
      { error: "No se encontraron pedidos con los datos suministrados" },
      { status: 404 }
    )
  }

  return NextResponse.json(result)
}
