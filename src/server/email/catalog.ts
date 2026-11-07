import "server-only"

import * as t from "@/server/email/templates"
import type { EmailContent, EmailCopy } from "@/server/email/templates"

/**
 * Catálogo de los correos automáticos de la tienda: qué son, cuándo salen y
 * cuáles se pueden apagar. Lo usa el admin (Email marketing) y email.service.
 */
export const EMAIL_KEYS = [
  "order_confirmation",
  "order_shipped",
  "order_ready_pickup",
  "payment_rejected",
  "gift_card",
  "guest_invitation",
  "link_guest_orders",
  "customer_password_reset",
  "login_alert",
  "club_welcome",
  "pqrs_confirmation",
  "pqrs_admin",
  "admin_password_reset",
] as const

export type EmailKey = (typeof EMAIL_KEYS)[number]

export interface EmailCatalogEntry {
  key: EmailKey
  label: string
  /** Cuándo se envía, en palabras del negocio. */
  trigger: string
  audience: "cliente" | "interno"
  /** false = obligatorio (seguridad, legal o parte de la compra): no se puede apagar. */
  toggleable: boolean
  /** false = el texto se edita en otra pantalla (ver `textNote`). */
  textEditable: boolean
  textNote?: string
  placeholders: string[]
  /** Render con datos de ejemplo para la vista previa y el correo de prueba. */
  sample: (copy?: EmailCopy) => EmailContent
}

const BASE = "https://tiendaonestar.com"
const ORDER_ID = "cmprueba0000ejemplo1234"
const PQRS = {
  name: "Laura Gómez",
  ticketNumber: "PQRS-2026-0001",
  type: "Consulta",
  maxDays: 10,
  description: "Quiero saber qué datos personales tienen registrados.",
}

export const EMAIL_CATALOG: readonly EmailCatalogEntry[] = [
  {
    key: "order_confirmation",
    label: "Confirmación de pedido",
    trigger: "Cuando la pasarela aprueba el pago (o se marca pagado a mano). También con «Reenviar email» en el pedido.",
    audience: "cliente",
    toggleable: false,
    textEditable: true,
    placeholders: ["{nombre}", "{pedido}"],
    sample: (copy) =>
      t.orderConfirmationEmail({
        name: "Laura Gómez",
        orderId: ORDER_ID,
        items: [
          { productName: "HOKA Mafate 5 · Talla 38", quantity: 1, unitPrice: 899900 },
          { productName: "Cordones planos", quantity: 2, unitPrice: 10000 },
        ],
        total: 919900,
        copy,
      }),
  },
  {
    key: "order_shipped",
    label: "Pedido enviado",
    trigger: "Cuando el pedido pasa a «Enviado» en el admin. Incluye transportadora y guía si se registraron.",
    audience: "cliente",
    toggleable: true,
    textEditable: true,
    placeholders: ["{nombre}", "{pedido}"],
    sample: (copy) =>
      t.orderShippedEmail({
        name: "Laura Gómez",
        orderId: ORDER_ID,
        carrierLabel: "Envía",
        trackingNumber: "123456789012",
        trackingUrl: "https://envia.co/rastreo?guia=123456789012",
        copy,
      }),
  },
  {
    key: "order_ready_pickup",
    label: "Listo para recoger",
    trigger: "Cuando un pedido de recoger en tienda pasa a «Listo para recoger» en el admin.",
    audience: "cliente",
    toggleable: true,
    textEditable: true,
    placeholders: ["{nombre}", "{pedido}"],
    sample: (copy) =>
      t.orderReadyForPickupEmail({
        name: "Laura Gómez",
        orderId: ORDER_ID,
        storeName: "One Star Fundadores",
        storeAddress: "C.C. Fundadores, local 158, Manizales",
        copy,
      }),
  },
  {
    key: "payment_rejected",
    label: "Pago rechazado",
    trigger: "Cuando la pasarela rechaza o falla el pago y el pedido se cierra sin cobro.",
    audience: "cliente",
    toggleable: true,
    textEditable: true,
    placeholders: ["{nombre}", "{pedido}"],
    sample: (copy) => t.paymentRejectedEmail({ name: "Laura Gómez", orderId: ORDER_ID, storeUrl: BASE, copy }),
  },
  {
    key: "gift_card",
    label: "Tarjeta de regalo",
    trigger: "Cuando se aprueba el pago de un pedido con tarjeta de regalo.",
    audience: "cliente",
    toggleable: false,
    textEditable: true,
    placeholders: ["{nombre}", "{pedido}"],
    sample: (copy) =>
      t.giftCardDeliveryEmail({
        name: "Laura Gómez",
        orderId: ORDER_ID,
        cards: [{ code: "OS-ABCD-EFGH-1234", balance: 200000 }],
        copy,
      }),
  },
  {
    key: "guest_invitation",
    label: "Activa tu cuenta",
    trigger: "Después del pago, si la persona compró como invitada y su correo no tiene cuenta.",
    audience: "cliente",
    toggleable: true,
    textEditable: true,
    placeholders: ["{nombre}"],
    sample: (copy) =>
      t.guestAccountInvitationEmail({ name: "Laura Gómez", inviteUrl: `${BASE}/crear-cuenta?token=EJEMPLO`, copy }),
  },
  {
    key: "link_guest_orders",
    label: "Vincular compras",
    trigger: "Cuando un cliente con cuenta pide unir las compras que hizo como invitado.",
    audience: "cliente",
    toggleable: false,
    textEditable: true,
    placeholders: ["{nombre}"],
    sample: (copy) =>
      t.linkGuestOrdersEmail({ name: "Laura Gómez", verifyUrl: `${BASE}/cuenta?vincularToken=EJEMPLO`, copy }),
  },
  {
    key: "customer_password_reset",
    label: "Recuperar contraseña (cliente)",
    trigger: "Desde «¿Olvidaste tu contraseña?» en el inicio de sesión de clientes.",
    audience: "cliente",
    toggleable: false,
    textEditable: true,
    placeholders: ["{nombre}"],
    sample: (copy) =>
      t.customerPasswordResetEmail({ name: "Laura Gómez", resetUrl: `${BASE}/restablecer-contrasena?token=EJEMPLO`, copy }),
  },
  {
    key: "login_alert",
    label: "Alerta de inicio de sesión",
    trigger: "Cada vez que un cliente inicia sesión (a los administradores no les llega).",
    audience: "cliente",
    toggleable: true,
    textEditable: true,
    placeholders: ["{nombre}"],
    sample: (copy) => t.loginAlertEmail({ name: "Laura Gómez", whenLabel: "5 de noviembre de 2026, 10:30 a. m.", copy }),
  },
  {
    key: "club_welcome",
    label: "Bienvenida a One Star Club",
    trigger: "Una sola vez, cuando el cliente se une al club.",
    audience: "cliente",
    toggleable: true,
    textEditable: false,
    textNote: "El asunto y el texto se editan en Configuración → One Star Club.",
    placeholders: [],
    sample: () =>
      t.clubWelcomeEmail({
        name: "Laura Gómez",
        newsletter: true,
        clubUrl: `${BASE}/club`,
        unsubscribeUrl: `${BASE}/baja-publicidad?token=EJEMPLO`,
      }),
  },
  {
    key: "pqrs_confirmation",
    label: "Confirmación de PQRS",
    trigger: "Al radicar una PQRS (obligatorio por la Ley 1581).",
    audience: "cliente",
    toggleable: false,
    textEditable: true,
    placeholders: ["{nombre}", "{radicado}"],
    sample: (copy) => t.pqrsConfirmationEmail({ ...PQRS, copy }),
  },
  {
    key: "pqrs_admin",
    label: "Aviso interno de PQRS",
    trigger: "Al radicar una PQRS. Va al correo de protección de datos de Configuración.",
    audience: "interno",
    toggleable: false,
    textEditable: true,
    placeholders: ["{nombre}", "{radicado}"],
    sample: (copy) =>
      t.pqrsAdminNotificationEmail({ ...PQRS, document: "CC 1234567890", email: "cliente@ejemplo.com", copy }),
  },
  {
    key: "admin_password_reset",
    label: "Recuperar contraseña (admin)",
    trigger: "Desde «¿Olvidaste tu contraseña?» en /admin/login.",
    audience: "interno",
    toggleable: false,
    textEditable: true,
    placeholders: ["{nombre}"],
    sample: (copy) =>
      t.adminPasswordResetEmail({ name: "Administrador", resetUrl: `${BASE}/admin/restablecer-contrasena?token=EJEMPLO`, copy }),
  },
]

export function getCatalogEntry(key: string): EmailCatalogEntry | undefined {
  return EMAIL_CATALOG.find((entry) => entry.key === key)
}
