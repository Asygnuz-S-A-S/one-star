import "server-only"
import { Resend } from "resend"

/**
 * Cliente de envío de correos transaccionales vía SendGrid o Resend.
 *
 * Configuración (.env):
 *   SENDGRID_API_KEY — API key de SendGrid (prioridad si está configurada)
 *   RESEND_API_KEY   — API key de Resend (https://resend.com/api-keys)
 *   EMAIL_FROM       — remitente, ej. "One Star <contacto@onestar.com.co>"
 *
 * Si ninguna API key está configurada, el envío se omite con un aviso
 * sin romper el flujo de negocio (checkout, pedidos y login siguen operando).
 */

const FROM_FALLBACK = "One Star <onboarding@resend.dev>"

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!resendClient) resendClient = new Resend(apiKey)
  return resendClient
}

export interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * Envío directo a través de la API REST oficial v3 de SendGrid (sin dependencias pesadas adicionales).
 */
async function sendViaSendGrid(apiKey: string, from: string, to: string, subject: string, html: string): Promise<SendEmailResult> {
  try {
    const fromMatch = from.match(/^(?:(.*?)<)?([^>]+)>?$/)
    const fromEmail = fromMatch ? fromMatch[2].trim() : from
    const fromName = fromMatch && fromMatch[1] ? fromMatch[1].trim() : "One Star"

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[email] SendGrid rechazó el correo a ${to} (HTTP ${response.status}):`, errText)
      return { success: false, error: `SendGrid error: ${response.statusText}` }
    }

    const messageId = response.headers.get("x-message-id") ?? undefined
    return { success: true, id: messageId }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[email] Excepción enviando con SendGrid a ${to}:`, message)
    return { success: false, error: message }
  }
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM || FROM_FALLBACK

  // 1. Priorizar SendGrid si el cliente provee la clave
  const sendgridKey = process.env.SENDGRID_API_KEY
  if (sendgridKey) {
    return sendViaSendGrid(sendgridKey, from, to, subject, html)
  }

  // 2. Operar con Resend
  const resend = getResendClient()
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({ from, to, subject, html })
      if (error) {
        console.error(`[email] Resend rechazó el correo a ${to}:`, error.message)
        return { success: false, error: error.message }
      }
      return { success: true, id: data?.id }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[email] Excepción enviando correo a ${to}:`, message)
      return { success: false, error: message }
    }
  }

  console.warn(`[email] Ni SENDGRID_API_KEY ni RESEND_API_KEY configuradas — correo "${subject}" a ${to} omitido.`)
  return { success: false, error: "Servicio de email no configurado" }
}
