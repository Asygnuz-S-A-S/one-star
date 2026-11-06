import "server-only"

import { getResendClient } from "@/server/email/resend.client"
import { processUnsubscribeEmail } from "@/server/services/unsubscribe.service"

export type ResendWebhookOutcome = "not_configured" | "invalid_signature" | "unsubscribed" | "ignored"

interface WebhookHeaders {
  id: string | null
  timestamp: string | null
  signature: string | null
}

/**
 * Webhook de Resend (firmado con svix). Retira el consentimiento en la tienda
 * cuando alguien se da de baja desde una campaña o marca el correo como spam.
 * Fail-closed: sin RESEND_WEBHOOK_SECRET no se acepta nada.
 */
export async function handleResendWebhook(payload: string, headers: WebhookHeaders): Promise<ResendWebhookOutcome> {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  const resend = getResendClient()
  if (!secret || !resend) return "not_configured"
  if (!headers.id || !headers.timestamp || !headers.signature) return "invalid_signature"

  let event: ReturnType<typeof resend.webhooks.verify>
  try {
    event = resend.webhooks.verify({
      payload,
      headers: { id: headers.id, timestamp: headers.timestamp, signature: headers.signature },
      webhookSecret: secret,
    })
  } catch {
    return "invalid_signature"
  }

  const emails =
    event.type === "contact.updated" && event.data.unsubscribed
      ? [event.data.email]
      : event.type === "email.complained"
        ? event.data.to
        : []
  if (emails.length === 0) return "ignored"

  for (const email of emails) await processUnsubscribeEmail(email, { fromResend: true })
  return "unsubscribed"
}
