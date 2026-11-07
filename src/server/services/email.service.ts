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
  adminPasswordResetEmail,
  orderShippedEmail,
  orderReadyForPickupEmail,
  paymentRejectedEmail,
  customerPasswordResetEmail,
  type OrderEmailItem,
  type GiftCardEmailCard,
} from "@/server/email/templates"
import { createUnsubscribeToken } from "@/server/services/unsubscribe.service"
import { getEmailSettings } from "@/server/services/email-settings.service"
import type { EmailKey } from "@/server/email/catalog"

export type { OrderEmailItem, GiftCardEmailCard }

const BOGOTA_TZ = "America/Bogota"

/** Resultado cuando el correo está apagado en Admin → Email marketing. */
const SKIPPED: SendEmailResult = { success: true }

/** Lee los ajustes del correo; `null` = está apagado y no se envía. */
async function settingsFor(key: EmailKey) {
  const settings = await getEmailSettings(key)
  return settings.enabled ? settings : null
}

function baseUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
}

/** Enlace a la consulta pública del pedido, con el número ya escrito. */
function trackOrderUrl(orderId: string): string | undefined {
  const base = baseUrl()
  return base ? `${base}/rastrear-pedido?pedido=${orderId.slice(-8).toUpperCase()}` : undefined
}

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

  const settings = await settingsFor("login_alert")
  if (!settings) return SKIPPED
  const { subject, html } = loginAlertEmail({ name: params.name, whenLabel, copy: settings.copy })
  return sendEmail({ to: params.email, subject, html })
}

/** Envía el correo de confirmación de compra al cliente. */
export async function sendOrderConfirmationEmail(params: {
  email: string
  name?: string
  orderId: string
  items: OrderEmailItem[]
  total: number
  pickupStore?: { name: string; address: string }
}): Promise<SendEmailResult> {
  const { copy } = await getEmailSettings("order_confirmation")
  const { subject, html } = orderConfirmationEmail({
    copy,
    name: params.name,
    orderId: params.orderId,
    items: params.items,
    total: params.total,
    pickupStore: params.pickupStore,
    trackOrderUrl: trackOrderUrl(params.orderId),
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
  const { copy } = await getEmailSettings("gift_card")
  const { subject, html } = giftCardDeliveryEmail({
    copy,
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
  if (!(await settingsFor("club_welcome"))) return SKIPPED
  const copy = await getClubCopy().catch(() => null)
  const unsubscribeToken = createUnsubscribeToken(params.email)
  const unsubscribeUrl = `${baseUrl()}/baja-publicidad?token=${unsubscribeToken}`
  const { subject, html } = clubWelcomeEmail({
    name: params.name,
    newsletter: params.newsletter,
    clubUrl: `${baseUrl()}/club`,
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
  const settings = await settingsFor("guest_invitation")
  if (!settings) return SKIPPED
  const { subject, html } = guestAccountInvitationEmail({
    copy: settings.copy,
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
  const { copy } = await getEmailSettings("link_guest_orders")
  const { subject, html } = linkGuestOrdersEmail({
    copy,
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
  const { copy } = await getEmailSettings("pqrs_confirmation")
  const { subject, html } = pqrsConfirmationEmail({ ...params, copy })
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
  const { copy } = await getEmailSettings("pqrs_admin")
  const { subject, html } = pqrsAdminNotificationEmail({ ...params, copy })
  return sendEmail({ to: params.toEmail, subject, html })
}

/** Envía el correo para restablecer contraseña de administrador. */
export async function sendAdminPasswordResetEmail(params: {
  email: string
  name?: string
  resetUrl: string
}): Promise<SendEmailResult> {
  const { copy } = await getEmailSettings("admin_password_reset")
  const { subject, html } = adminPasswordResetEmail({
    copy,
    name: params.name,
    resetUrl: params.resetUrl,
  })
  return sendEmail({ to: params.email, subject, html })
}

/** Aviso de despacho con transportadora y guía. */
export async function sendOrderShippedEmail(params: {
  email: string
  name?: string
  orderId: string
  carrierLabel?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
}): Promise<SendEmailResult> {
  const settings = await settingsFor("order_shipped")
  if (!settings) return SKIPPED
  const { subject, html } = orderShippedEmail({ ...params, trackOrderUrl: trackOrderUrl(params.orderId), copy: settings.copy })
  return sendEmail({ to: params.email, subject, html })
}

/** Aviso de que un pedido de recoger en tienda ya está listo. */
export async function sendOrderReadyForPickupEmail(params: {
  email: string
  name?: string
  orderId: string
  storeName: string
  storeAddress?: string
}): Promise<SendEmailResult> {
  const settings = await settingsFor("order_ready_pickup")
  if (!settings) return SKIPPED
  const { subject, html } = orderReadyForPickupEmail({ ...params, trackOrderUrl: trackOrderUrl(params.orderId), copy: settings.copy })
  return sendEmail({ to: params.email, subject, html })
}

/** Aviso de pago rechazado: el pedido se cerró sin cobro. */
export async function sendPaymentRejectedEmail(params: {
  email: string
  name?: string
  orderId: string
}): Promise<SendEmailResult> {
  const settings = await settingsFor("payment_rejected")
  if (!settings) return SKIPPED
  const { subject, html } = paymentRejectedEmail({ ...params, storeUrl: baseUrl() || "/", copy: settings.copy })
  return sendEmail({ to: params.email, subject, html })
}

/** Enlace para que un cliente restablezca su contraseña. */
export async function sendCustomerPasswordResetEmail(params: {
  email: string
  name?: string
  resetUrl: string
}): Promise<SendEmailResult> {
  const { copy } = await getEmailSettings("customer_password_reset")
  const { subject, html } = customerPasswordResetEmail({ name: params.name, resetUrl: params.resetUrl, copy })
  return sendEmail({ to: params.email, subject, html })
}
