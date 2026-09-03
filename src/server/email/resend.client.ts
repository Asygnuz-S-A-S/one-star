import "server-only"
import { Resend } from "resend"

/**
 * Cliente de envío de correos transaccionales vía Resend.
 *
 * Configuración (.env):
 *   RESEND_API_KEY   — API key de Resend (https://resend.com/api-keys)
 *   EMAIL_FROM       — remitente, ej. "One Star <no-reply@tudominio.com>"
 *
 * Si RESEND_API_KEY no está configurada, el envío se omite con un aviso
 * (no rompe el flujo de negocio: login y compra siguen funcionando).
 */

const FROM_FALLBACK = "One Star <onboarding@resend.dev>"

let client: Resend | null = null

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!client) client = new Resend(apiKey)
  return client
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

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<SendEmailResult> {
  const resend = getClient()
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY no configurada — correo "${subject}" a ${to} NO enviado.`)
    return { success: false, error: "RESEND_API_KEY no configurada" }
  }

  const from = process.env.EMAIL_FROM || FROM_FALLBACK

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
