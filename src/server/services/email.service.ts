import "server-only"
import { sendEmail, type SendEmailResult } from "@/server/email/resend.client"
import { getClubCopy } from "@/server/services/store-settings.service"
import {
  loginAlertEmail,
  orderConfirmationEmail,
  giftCardDeliveryEmail,
  clubWelcomeEmail,
  guestAccountInvitationEmail,
  linkGuestOrdersEmail,
  pqrsConfirmationEmail,
  pqrsAdminNotificationEmail,
  type OrderEmailItem,
  type GiftCardEmailCard,
} from "@/server/email/templates"
import { createUnsubscribeToken } from "@/server/services/unsubscribe.service"

export type { OrderEmailItem, GiftCardEmailCard }

const BOGOTA_TZ = "America/Bogota"

/** Envía el correo de alerta de inicio de sesión a un cliente. */
export async function sendLoginAlertEmail(params: {
  email: string
  name?: string
}): Promise<SendEmailResult> {
  const whenLabel = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: BOGOTA_TZ,
  }).format(new Date())

  const { subject, html } = loginAlertEmail({ name: params.name, whenLabel })
  return sendEmail({ to: params.email, subject, html })
}

/** Envía el correo de confirmación de compra al cliente. */
export async function sendOrderConfirmationEmail(params: {
  email: string
  name?: string
  orderId: string
  items: OrderEmailItem[]
  total: number
}): Promise<SendEmailResult> {
  const { subject, html } = orderConfirmationEmail({
    name: params.name,
    orderId: params.orderId,
    items: params.items,
    total: params.total,
  })
  return sendEmail({ to: params.email, subject, html })
}

/** Envía el correo con el/los código(s) de tarjeta de regalo recién emitidos. */
export async function sendGiftCardEmail(params: {
  email: string
  name?: string
  orderId: string
  cards: GiftCardEmailCard[]
}): Promise<SendEmailResult> {
  const { subject, html } = giftCardDeliveryEmail({
    name: params.name,
    orderId: params.orderId,
    cards: params.cards,
  })
  return sendEmail({ to: params.email, subject, html })
}

/** Correo de bienvenida a One Star Club. */
export async function sendClubWelcomeEmail(params: {
  email: string
  name?: string
  newsletter: boolean
}): Promise<SendEmailResult> {
  const baseUrl = (process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const copy = await getClubCopy().catch(() => null)
  const unsubscribeToken = createUnsubscribeToken(params.email)
  const unsubscribeUrl = `${baseUrl}/baja-publicidad?token=${unsubscribeToken}`
  const { subject, html } = clubWelcomeEmail({
    name: params.name,
    newsletter: params.newsletter,
    clubUrl: `${baseUrl}/club`,
    unsubscribeUrl,
    subject: copy?.welcomeSubject,
    body: copy?.welcomeBody,
  })
  return sendEmail({ to: params.email, subject, html })
}

/** Envía el correo de invitación al comprador invitado para crear su contraseña y activar su cuenta. */
export async function sendGuestAccountInvitationEmail(params: {
  email: string
  name?: string
  inviteUrl: string
}): Promise<SendEmailResult> {
  const { subject, html } = guestAccountInvitationEmail({
    name: params.name,
    inviteUrl: params.inviteUrl,
  })
  return sendEmail({ to: params.email, subject, html })
}

/** Envía el correo para confirmar la vinculación de compras realizadas como invitado a una cuenta existente. */
export async function sendLinkGuestOrdersEmail(params: {
  email: string
  name?: string
  verifyUrl: string
}): Promise<SendEmailResult> {
  const { subject, html } = linkGuestOrdersEmail({
    name: params.name,
    verifyUrl: params.verifyUrl,
  })
  return sendEmail({ to: params.email, subject, html })
}

/** Envía la confirmación del radicado PQRS al titular. */
export async function sendPqrsConfirmationEmail(params: {
  email: string
  name: string
  ticketNumber: string
  type: string
  maxDays: number
  description: string
}): Promise<SendEmailResult> {
  const { subject, html } = pqrsConfirmationEmail(params)
  return sendEmail({ to: params.email, subject, html })
}

/** Envía el aviso de radicado PQRS al correo del responsable de datos. */
export async function sendPqrsAdminNotificationEmail(params: {
  toEmail: string
  name: string
  document: string
  email: string
  ticketNumber: string
  type: string
  maxDays: number
  description: string
}): Promise<SendEmailResult> {
  const { subject, html } = pqrsAdminNotificationEmail(params)
  return sendEmail({ to: params.toEmail, subject, html })
}


