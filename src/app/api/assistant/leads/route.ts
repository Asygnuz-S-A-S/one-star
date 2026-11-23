import { NextResponse } from "next/server"
import {
  authenticateAssistantRequest,
  checkLeadPhoneRateLimit,
} from "@/server/services/assistant-auth.service"
import {
  getWhatsappBotGlobalEnabled,
  getWhatsappBotStatusForPhone,
  upsertLeadByPhone,
} from "@/server/services/lead.service"
import {
  assistantLeadUpsertSchema,
  waPhoneSchema,
} from "@/server/validators/lead.validator"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const auth = await authenticateAssistantRequest(request)
  if (!auth.authorized) {
    return auth.response
  }

  const { searchParams } = new URL(request.url)
  const rawPhone = searchParams.get("waPhone") ?? searchParams.get("phone") ?? ""
  const parsedPhone = waPhoneSchema.safeParse(rawPhone)
  if (!parsedPhone.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parsedPhone.error.issues },
      { status: 400 }
    )
  }

  const phoneLimit = await checkLeadPhoneRateLimit(request.headers, parsedPhone.data)
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

  const status = await getWhatsappBotStatusForPhone(parsedPhone.data)
  return NextResponse.json(status)
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

  const parsed = assistantLeadUpsertSchema.safeParse(body)
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

  const [lead, botGlobalEnabled] = await Promise.all([
    upsertLeadByPhone(parsed.data),
    getWhatsappBotGlobalEnabled(),
  ])

  const shouldRespond = botGlobalEnabled && !lead.botPaused && !lead.optedOut

  return NextResponse.json({
    lead,
    botGlobalEnabled,
    shouldRespond,
  })
}
