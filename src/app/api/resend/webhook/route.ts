import { NextResponse } from "next/server"
import { handleResendWebhook } from "@/server/services/resend-webhook.service"

/**
 * POST /api/resend/webhook
 * Eventos de Resend: bajas desde campañas (contact.updated) y quejas de spam
 * (email.complained) retiran el consentimiento de publicidad en la tienda.
 */
export async function POST(request: Request) {
  const outcome = await handleResendWebhook(await request.text(), {
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
  })
  if (outcome === "not_configured") {
    console.error("[resend/webhook] RESEND_WEBHOOK_SECRET o RESEND_API_KEY sin configurar — evento rechazado")
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  if (outcome === "invalid_signature") return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  return NextResponse.json({ ok: true, outcome })
}
