import { NextResponse } from "next/server"
import {
  authenticateAssistantRequest,
  checkLeadPhoneRateLimit,
} from "@/server/services/assistant-auth.service"
import { createAssistantCheckoutLink } from "@/server/services/assistant.service"
import { assistantCheckoutLinkSchema } from "@/server/validators/assistant.validator"

export const dynamic = "force-dynamic"

function getBaseUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
  const proto = req.headers.get("x-forwarded-proto") || "https"
  return host ? `${proto}://${host}` : "https://tiendaonestar.com"
}

export async function POST(request: Request) {
  const auth = await authenticateAssistantRequest(request)
  if (!auth.authorized) {
    return auth.response
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
  }

  const parsed = assistantCheckoutLinkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const phoneLimit = await checkLeadPhoneRateLimit(request.headers, parsed.data.waPhone)
  if (!phoneLimit.allowed) {
    return NextResponse.json(
      { error: "Límite de peticiones por teléfono excedido. Intenta más tarde." },
      {
        status: 429,
        headers: phoneLimit.retryAfterSeconds
          ? { "Retry-After": String(phoneLimit.retryAfterSeconds) }
          : undefined,
      }
    )
  }

  const result = await createAssistantCheckoutLink(parsed.data, getBaseUrl(request))
  if (!result) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
  }

  return NextResponse.json(result)
}
