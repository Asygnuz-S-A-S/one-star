/**
 * Plantillas HTML de los correos transaccionales de One Star.
 * HTML "email-safe": tablas + estilos inline (compatibilidad con clientes de correo).
 */

export interface EmailContent {
  subject: string
  html: string
}

export interface OrderEmailItem {
  productName: string
  quantity: number
  /** Precio unitario en COP */
  unitPrice: number
}

const COLOR = {
  dark: "#1C1C1C",
  bg: "#F5F5F5",
  card: "#FFFFFF",
  text: "#1C1C1C",
  muted: "#6B7280",
  border: "#E5E7EB",
  accentBg: "#F3F4F6",
}

const currencyCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

function formatCOP(value: number): string {
  return currencyCOP.format(value)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Envuelve el contenido en el layout de marca (cabecera + footer). */
function layout(innerHtml: string, preheader: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:${COLOR.bg};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.bg};padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:${COLOR.card};border-radius:14px;overflow:hidden;border:1px solid ${COLOR.border};">
      <tr>
        <td style="background:${COLOR.dark};padding:22px 32px;">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:800;letter-spacing:2px;color:#FFFFFF;">ONE STAR</span>
        </td>
      </tr>
      <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:${COLOR.text};">
        ${innerHtml}
      </td></tr>
      <tr>
        <td style="padding:20px 32px;background:${COLOR.accentBg};border-top:1px solid ${COLOR.border};font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${COLOR.muted};">
          One Star — Urban Performance. Este es un correo automático, por favor no respondas.
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

function greeting(name?: string): string {
  const safe = name ? escapeHtml(name.split(" ")[0]) : null
  return safe ? `Hola ${safe},` : "Hola,"
}

/** Textos editables desde el admin. Vacío = el texto por defecto del código. */
export interface EmailCopy {
  subject?: string | null
  intro?: string | null
}

/** Reemplaza {nombre}, {pedido}, {radicado}… por su valor; deja intactas las llaves desconocidas. */
export function fillPlaceholders(text: string, vars: Record<string, string | undefined>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match)
}

function subjectOr(copy: EmailCopy | undefined, vars: Record<string, string | undefined>, fallback: string): string {
  const custom = copy?.subject?.trim()
  return custom ? fillPlaceholders(custom, vars) : fallback
}

/** Texto principal propio (texto plano, escapado, saltos de línea respetados) o el HTML por defecto. */
function introOr(copy: EmailCopy | undefined, vars: Record<string, string | undefined>, fallbackHtml: string): string {
  const custom = copy?.intro?.trim()
  return custom ? escapeHtml(fillPlaceholders(custom, vars)).replace(/\n/g, "<br />") : fallbackHtml
}

function firstName(name?: string): string | undefined {
  return name?.trim().split(" ")[0] || undefined
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0 24px;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#E31C23;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;padding:14px 22px;border-radius:8px;">${escapeHtml(label)}</a></p>`
}

/** Correo de alerta cuando el usuario inicia sesión. */
export function loginAlertEmail(params: { name?: string; whenLabel: string; copy?: EmailCopy }): EmailContent {
  const vars = { nombre: firstName(params.name) }
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Nuevo inicio de sesión</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">${greeting(params.name)}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      Detectamos un inicio de sesión en tu cuenta de One Star el
      <strong>${escapeHtml(params.whenLabel)}</strong>.
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${COLOR.muted};">
      ${introOr(params.copy, vars, `Si fuiste tú, no tienes que hacer nada. Si no reconoces esta actividad,
      te recomendamos cambiar tu contraseña cuanto antes.`)}
    </p>`
  return {
    subject: subjectOr(params.copy, vars, "Nuevo inicio de sesión en tu cuenta One Star"),
    html: layout(inner, "Detectamos un inicio de sesión en tu cuenta One Star."),
  }
}

/** Correo de confirmación de compra. */
export function orderConfirmationEmail(params: {
  name?: string
  orderId: string
  items: OrderEmailItem[]
  total: number
  /** Pedido para recoger: reemplaza el aviso de despacho. */
  pickupStore?: { name: string; address: string }
  /** Página pública de seguimiento (sirve sin cuenta). */
  trackOrderUrl?: string
  copy?: EmailCopy
}): EmailContent {
  const rows = params.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${COLOR.border};font-size:14px;color:${COLOR.text};">
          ${escapeHtml(item.productName)}
          <span style="color:${COLOR.muted};"> × ${item.quantity}</span>
        </td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${COLOR.border};font-size:14px;color:${COLOR.text};white-space:nowrap;">
          ${formatCOP(item.unitPrice * item.quantity)}
        </td>
      </tr>`
    )
    .join("")

  const shortId = params.orderId.slice(-8).toUpperCase()
  const vars = { nombre: firstName(params.name), pedido: shortId }

  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">¡Gracias por tu compra!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">${greeting(params.name)}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      ${introOr(params.copy, vars, `Recibimos tu pedido <strong>#${escapeHtml(shortId)}</strong>. Aquí está el resumen:`)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      ${rows}
      <tr>
        <td style="padding:16px 0 0;font-size:16px;font-weight:700;color:${COLOR.text};">Total</td>
        <td align="right" style="padding:16px 0 0;font-size:16px;font-weight:700;color:${COLOR.text};white-space:nowrap;">
          ${formatCOP(params.total)}
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:${COLOR.muted};">
      ${params.pickupStore
        ? `Recoges tu pedido en <strong>${escapeHtml(params.pickupStore.name)}</strong>${params.pickupStore.address ? ` (${escapeHtml(params.pickupStore.address)})` : ""}. Te avisaremos cuando esté listo; lleva tu documento.`
        : "Te avisaremos cuando tu pedido sea despachado."} ¡Gracias por confiar en One Star!
    </p>
    ${params.trackOrderUrl ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${COLOR.muted};">Consulta el estado cuando quieras en <a href="${escapeHtml(params.trackOrderUrl)}" style="color:${COLOR.text};">Rastrear mi pedido</a>, con este número y tu correo.</p>` : ""}`

  return {
    subject: subjectOr(params.copy, vars, `Confirmación de tu pedido One Star #${shortId}`),
    html: layout(inner, `Recibimos tu pedido #${shortId}. Total: ${formatCOP(params.total)}.`),
  }
}

export interface GiftCardEmailCard {
  code: string
  balance: number
}

export function giftCardDeliveryEmail(params: {
  name?: string
  orderId: string
  cards: GiftCardEmailCard[]
  copy?: EmailCopy
}): EmailContent {
  const shortId = params.orderId.slice(-8).toUpperCase()
  const plural = params.cards.length > 1
  const vars = { nombre: firstName(params.name), pedido: shortId }

  const cardsHtml = params.cards
    .map(
      (card) => `
      <tr>
        <td style="padding:16px;border:1px dashed ${COLOR.border};border-radius:8px;">
          <div style="font-size:12px;letter-spacing:0.05em;color:${COLOR.muted};text-transform:uppercase;">Código</div>
          <div style="font-size:20px;font-weight:700;letter-spacing:0.05em;color:${COLOR.text};margin:4px 0 8px;">${escapeHtml(card.code)}</div>
          <div style="font-size:14px;color:${COLOR.text};">Saldo: <strong>${formatCOP(card.balance)}</strong></div>
        </td>
      </tr>
      <tr><td style="height:12px;"></td></tr>`
    )
    .join("")

  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${plural ? "Tus tarjetas de regalo" : "Tu tarjeta de regalo"}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">${greeting(params.name)}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      ${introOr(params.copy, vars, `Gracias por tu compra <strong>#${escapeHtml(shortId)}</strong>. ${plural ? "Aquí están tus códigos" : "Aquí está tu código"}
      para usar en cualquier tienda física o al comprar de nuevo en línea One Star:`)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${cardsHtml}
    </table>
    <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:${COLOR.muted};">
      Guarda este correo: el código es la única forma de usar el saldo.
    </p>`

  return {
    subject: subjectOr(
      params.copy,
      vars,
      plural ? `Tus tarjetas de regalo One Star #${shortId}` : `Tu tarjeta de regalo One Star #${shortId}`
    ),
    html: layout(inner, plural ? "Tus tarjetas de regalo ya están listas." : "Tu tarjeta de regalo ya está lista."),
  }
}

/** Bienvenida a One Star Club. */
export function clubWelcomeEmail(params: {
  name?: string
  newsletter: boolean
  clubUrl: string
  unsubscribeUrl?: string
  subject?: string
  body?: string
}): EmailContent {
  const subject = params.subject?.trim() || "Bienvenido a One Star Club"
  const body = params.body?.trim() || "Ya eres parte de One Star Club. Desde tu cuenta puedes ver las promociones exclusivas para miembros y usar sus códigos en el checkout."
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${escapeHtml(subject)}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">${greeting(params.name)}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      ${escapeHtml(body)}
    </p>
    ${params.newsletter ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">También te enviaremos lanzamientos y novedades a este correo. Puedes dejar de recibirlos cuando quieras desde tu cuenta.</p>` : ""}
    <p style="margin:24px 0 0;"><a href="${escapeHtml(params.clubUrl)}" style="display:inline-block;background:#E31C23;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;padding:14px 22px;border-radius:8px;">VER MIS BENEFICIOS</a></p>
    ${params.unsubscribeUrl ? `
    <p style="margin:32px 0 0;font-size:12px;line-height:1.5;color:${COLOR.muted};border-top:1px solid #ECECEA;padding-top:16px;">
      Si no deseas recibir más comunicaciones comerciales o de mercadeo, puedes <a href="${escapeHtml(params.unsubscribeUrl)}" style="color:${COLOR.muted};text-decoration:underline;">darte de baja aquí</a>.
    </p>` : ""}`
  return {
    subject,
    html: layout(inner, subject),
  }
}

/** Invitación para que un comprador invitado active su cuenta y consulte sus compras. */
export function guestAccountInvitationEmail(params: {
  name?: string
  inviteUrl: string
  copy?: EmailCopy
}): EmailContent {
  const vars = { nombre: firstName(params.name) }
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Activa tu cuenta en One Star</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">${greeting(params.name)}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      ${introOr(params.copy, vars, "¡Tu pago ha sido aprobado exitosamente! Para consultar el estado de tu pedido en cualquier momento y acumular tu historial de compras, activa tu cuenta creando tu contraseña en el siguiente enlace de un solo uso:")}
    </p>
    <p style="margin:24px 0 24px;">
      <a href="${escapeHtml(params.inviteUrl)}" style="display:inline-block;background:#E31C23;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;padding:14px 22px;border-radius:8px;">
        CREAR MI CONTRASEÑA
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${COLOR.muted};">
      Este enlace es válido por 7 días y solo puede usarse una vez. Si no realizaste esta compra, puedes ignorar este mensaje.
    </p>`
  return {
    subject: subjectOr(params.copy, vars, "Activa tu cuenta One Star y consulta tus pedidos"),
    html: layout(inner, "Activa tu cuenta en One Star para consultar el estado de tus compras."),
  }
}

/** Correo para confirmar la vinculación de pedidos realizados como invitado a una cuenta existente. */
export function linkGuestOrdersEmail(params: {
  name?: string
  verifyUrl: string
  copy?: EmailCopy
}): EmailContent {
  const vars = { nombre: firstName(params.name) }
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Vincula tus compras a tu cuenta One Star</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">${greeting(params.name)}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      ${introOr(params.copy, vars, "Recibimos una solicitud para vincular a tu cuenta de One Star los pedidos que hayas realizado como invitado con este correo electrónico.")}
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      Para confirmar y ver tus compras anteriores en tu perfil, haz clic en el siguiente botón:
    </p>
    <p style="margin:24px 0 24px;">
      <a href="${escapeHtml(params.verifyUrl)}" style="display:inline-block;background:#E31C23;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;padding:14px 22px;border-radius:8px;">
        VINCULAR MIS PEDIDOS
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${COLOR.muted};">
      Este enlace es válido por 24 horas y solo puede usarse una vez. Si no solicitaste vincular tus pedidos, puedes ignorar este correo de forma segura.
    </p>`
  return {
    subject: subjectOr(params.copy, vars, "Confirma la vinculación de tus compras a tu cuenta One Star"),
    html: layout(inner, "Confirma la vinculación de tus compras anteriores a tu cuenta One Star."),
  }
}

/** Confirmación de recepción de solicitud PQRS al titular. */
export function pqrsConfirmationEmail(params: {
  name: string
  ticketNumber: string
  type: string
  maxDays: number
  description: string
  copy?: EmailCopy
}): EmailContent {
  const vars = { nombre: firstName(params.name), radicado: params.ticketNumber }
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Radicado de solicitud: ${escapeHtml(params.ticketNumber)}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">${greeting(params.name)}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      ${introOr(params.copy, vars, "Hemos recibido tu solicitud ante nuestro canal de Habeas Data y Protección de Datos Personales.")}
    </p>
    <div style="background:#F9F9F9;border:1px solid #E0E0E0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:14px;color:${COLOR.text};"><strong>Número de radicado:</strong> ${escapeHtml(params.ticketNumber)}</p>
      <p style="margin:0 0 8px;font-size:14px;color:${COLOR.text};"><strong>Tipo de trámite:</strong> ${escapeHtml(params.type)}</p>
      <p style="margin:0;font-size:14px;color:${COLOR.text};"><strong>Término legal de respuesta:</strong> Hasta ${params.maxDays} días hábiles (Ley 1581 de 2012)</p>
    </div>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${COLOR.muted};">
      Tu solicitud se encuentra en trámite por el área de Administración. Te daremos respuesta formal a esta misma dirección de correo electrónico dentro del término legal aplicable.
    </p>`
  return {
    subject: subjectOr(params.copy, vars, `Confirmación de radicado ${params.ticketNumber} — Tienda One Star`),
    html: layout(inner, `Confirmación de radicado ${params.ticketNumber}`),
  }
}

/** Notificación al correo de protección de datos del Responsable. */
export function pqrsAdminNotificationEmail(params: {
  name: string
  document: string
  email: string
  ticketNumber: string
  type: string
  maxDays: number
  description: string
  copy?: EmailCopy
}): EmailContent {
  const vars = { nombre: firstName(params.name), radicado: params.ticketNumber }
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Nueva solicitud PQRS: ${escapeHtml(params.ticketNumber)}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      ${introOr(params.copy, vars, "Se ha recibido una nueva solicitud a través del canal oficial de Habeas Data:")}
    </p>
    <div style="background:#F9F9F9;border:1px solid #E0E0E0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:14px;"><strong>Radicado:</strong> ${escapeHtml(params.ticketNumber)}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Titular:</strong> ${escapeHtml(params.name)} (Doc: ${escapeHtml(params.document)})</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Correo:</strong> ${escapeHtml(params.email)}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Tipo:</strong> ${escapeHtml(params.type)}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Plazo de respuesta:</strong> ${params.maxDays} días hábiles</p>
      <p style="margin:8px 0 0;font-size:13px;color:#4A4A4A;"><strong>Descripción:</strong><br />${escapeHtml(params.description)}</p>
    </div>`
  return {
    subject: subjectOr(params.copy, vars, `[PQRS] Nueva solicitud ${params.ticketNumber} (${params.type})`),
    html: layout(inner, `Nueva solicitud PQRS ${params.ticketNumber}`),
  }
}

/** Notificación para restablecer contraseña de un administrador. */
export function adminPasswordResetEmail(params: {
  name?: string
  resetUrl: string
  copy?: EmailCopy
}): EmailContent {
  const vars = { nombre: firstName(params.name) }
  const greetingText = params.name ? `Hola ${escapeHtml(params.name)},` : "Hola,"
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${COLOR.dark};">Restablecer contraseña de administrador</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">${greetingText}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      ${introOr(params.copy, vars, "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de administrador en One Star.")}
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      Haz clic en el siguiente botón para definir tu nueva contraseña. Este enlace es de un solo uso y es válido durante <strong>1 hora</strong>.
    </p>
    <div style="margin:24px 0;text-align:center;">
      <a href="${escapeHtml(params.resetUrl)}" style="background:#E31C23;color:#FFFFFF;padding:12px 24px;border-radius:8px;font-weight:bold;text-decoration:none;display:inline-block;font-size:14px;">
        Restablecer mi contraseña
      </a>
    </div>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${COLOR.muted};">
      Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña actual no será modificada y tus sesiones activas continuarán vigentes.
    </p>`
  return {
    subject: subjectOr(params.copy, vars, "Restablece tu contraseña de administrador — Tienda One Star"),
    html: layout(inner, "Enlace para restablecer tu contraseña de administrador en One Star"),
  }
}

/** Aviso de despacho: el pedido salió con la transportadora. */
export function orderShippedEmail(params: {
  name?: string
  orderId: string
  carrierLabel?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  /** Página pública de seguimiento (sirve sin cuenta). */
  trackOrderUrl?: string
  copy?: EmailCopy
}): EmailContent {
  const shortId = params.orderId.slice(-8).toUpperCase()
  const vars = { nombre: firstName(params.name), pedido: shortId }
  const details = params.trackingNumber
    ? `<div style="background:#F9F9F9;border:1px solid #E0E0E0;border-radius:8px;padding:16px;margin:16px 0;">
      ${params.carrierLabel ? `<p style="margin:0 0 8px;font-size:14px;color:${COLOR.text};"><strong>Transportadora:</strong> ${escapeHtml(params.carrierLabel)}</p>` : ""}
      <p style="margin:0;font-size:14px;color:${COLOR.text};"><strong>Número de guía:</strong> ${escapeHtml(params.trackingNumber)}</p>
    </div>`
    : ""
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Tu pedido va en camino</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">${greeting(params.name)}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      ${introOr(params.copy, vars, `Tu pedido <strong>#${escapeHtml(shortId)}</strong> ya salió de nuestra bodega y va en camino.`)}
    </p>
    ${details}
    ${params.trackingUrl ? button(params.trackingUrl, "RASTREAR MI PEDIDO") : params.trackOrderUrl ? button(params.trackOrderUrl, "VER ESTADO DEL PEDIDO") : ""}
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${COLOR.muted};">
      Si tienes alguna pregunta sobre tu envío, escríbenos y con gusto te ayudamos.
    </p>`
  return {
    subject: subjectOr(params.copy, vars, `Tu pedido One Star #${shortId} va en camino`),
    html: layout(inner, `Tu pedido #${shortId} ya fue despachado.`),
  }
}

/** Pedido de recoger en tienda listo: el cliente ya puede pasar por él. */
export function orderReadyForPickupEmail(params: {
  name?: string
  orderId: string
  storeName: string
  storeAddress?: string
  trackOrderUrl?: string
  copy?: EmailCopy
}): EmailContent {
  const shortId = params.orderId.slice(-8).toUpperCase()
  const vars = { nombre: firstName(params.name), pedido: shortId }
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Tu pedido está listo para recoger</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">${greeting(params.name)}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      ${introOr(params.copy, vars, `Tu pedido <strong>#${escapeHtml(shortId)}</strong> ya está separado y puedes recogerlo.`)}
    </p>
    <div style="background:#F9F9F9;border:1px solid #E0E0E0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:14px;color:${COLOR.text};"><strong>Tienda:</strong> ${escapeHtml(params.storeName)}</p>
      ${params.storeAddress ? `<p style="margin:0;font-size:14px;color:${COLOR.text};"><strong>Dirección:</strong> ${escapeHtml(params.storeAddress)}</p>` : ""}
    </div>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${COLOR.muted};">
      Lleva tu documento de identidad y el número de pedido. Si otra persona lo recoge, debe llevar una copia de tu documento.
    </p>
    ${params.trackOrderUrl ? button(params.trackOrderUrl, "VER ESTADO DEL PEDIDO") : ""}`
  return {
    subject: subjectOr(params.copy, vars, `Tu pedido One Star #${shortId} está listo para recoger`),
    html: layout(inner, `Ya puedes recoger tu pedido #${shortId}.`),
  }
}

/** Pago rechazado o fallido: el pedido se cerró sin cobro. */
export function paymentRejectedEmail(params: {
  name?: string
  orderId: string
  storeUrl: string
  copy?: EmailCopy
}): EmailContent {
  const shortId = params.orderId.slice(-8).toUpperCase()
  const vars = { nombre: firstName(params.name), pedido: shortId }
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">No pudimos procesar tu pago</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">${greeting(params.name)}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      ${introOr(params.copy, vars, `El pago de tu pedido <strong>#${escapeHtml(shortId)}</strong> no fue aprobado, así que no se hizo ningún cobro. Puedes intentarlo de nuevo con otro medio de pago.`)}
    </p>
    ${button(params.storeUrl, "VOLVER A LA TIENDA")}
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${COLOR.muted};">
      Si el cobro sí aparece en tu banco, escríbenos con el número de pedido y lo revisamos.
    </p>`
  return {
    subject: subjectOr(params.copy, vars, `No pudimos procesar el pago de tu pedido #${shortId}`),
    html: layout(inner, `El pago de tu pedido #${shortId} no fue aprobado.`),
  }
}

/** Enlace para que un cliente restablezca su contraseña. */
export function customerPasswordResetEmail(params: {
  name?: string
  resetUrl: string
  copy?: EmailCopy
}): EmailContent {
  const vars = { nombre: firstName(params.name) }
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Restablece tu contraseña</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">${greeting(params.name)}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.text};">
      ${introOr(params.copy, vars, "Recibimos una solicitud para restablecer la contraseña de tu cuenta One Star. Usa el siguiente botón para crear una nueva.")}
    </p>
    ${button(params.resetUrl, "CREAR NUEVA CONTRASEÑA")}
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${COLOR.muted};">
      El enlace es de un solo uso y vence en 1 hora. Si no lo pediste, ignora este correo: tu contraseña no cambia.
    </p>`
  return {
    subject: subjectOr(params.copy, vars, "Restablece tu contraseña de One Star"),
    html: layout(inner, "Enlace para restablecer tu contraseña de One Star."),
  }
}
