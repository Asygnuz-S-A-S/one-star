import { NextResponse } from "next/server"
import {
  authenticateAssistantRequest,
  checkLeadPhoneRateLimit,
} from "@/server/services/assistant-auth.service"
import { createShortLink } from "@/server/services/lead.service"
import { assistantLeadLinkSchema } from "@/server/validators/lead.validator"

export const dynamic = "force-dynamic"

function getBaseUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
  const proto = req.headers.get("x-forwarded-proto") || "https"
  return host ? `${proto}://${host}` : "https://onestar.com.co"
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

  const parsed = assistantLeadLinkSchema.safeParse(body)
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

  const baseUrl = getBaseUrl(request)
  const result = await createShortLink({
    waPhone: parsed.data.waPhone,
    productSlug: parsed.data.productSlug,
    utmCampaign: parsed.data.utmCampaign,
    name: parsed.data.name,
    baseUrl,
  })

  return NextResponse.json({
    url: result.url,
    code: result.code,
  })
}
