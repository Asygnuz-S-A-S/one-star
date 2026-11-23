import "server-only"
import { randomBytes } from "node:crypto"
import type { LeadStage, Prisma } from "@prisma/client"
import {
  attachLeadToOrderRecord,
  countPendingHandoffLeads,
  createLeadEventRecord,
  findLeadById,
  findLeadByPhone,
  findLeadByShortCode,
  findPendingHandoffLeads,
  findStaleLeadsForAbandonment,
  getLeadsData,
  resolveLeadHandoffRecord,
  updateLeadBotPausedRecord,
  updateLeadShortLinkRecord,
  updateLeadStageRecord,
  updateLeadUtmRecord,
  upsertLeadRecord,
  type LeadEventItem,
  type LeadFilterParams,
  type LeadStats,
} from "../repositories/lead.repository"
import {
  getWhatsappBotEnabledRecord,
  updateStoreSettingsRecord,
} from "../repositories/store-settings.repository"
import { extractProductSlug, normalizeWaPhone } from "../validators/lead.validator"

export type { LeadStats, LeadEventItem }

export const ABANDONED_LEAD_TTL_HOURS = 24

/**
 * Orden estricto de avance de etapas para los leads de WhatsApp.
 * - Solo avanza hacia valores mayores.
 * - COMPRO (5) es el estado terminal máximo y nunca retrocede.
 */
export const LEAD_STAGE_ORDER: Record<LeadStage, number> = {
  NUEVO: 0,
  INTERESADO: 1,
  CARRITO: 2,
  CHECKOUT: 3,
  ABANDONO: 4,
  COMPRO: 5,
}

export function canAdvanceLeadStage(current: LeadStage, next: LeadStage): boolean {
  if (current === "COMPRO") return false
  return LEAD_STAGE_ORDER[next] > LEAD_STAGE_ORDER[current]
}

export interface LeadDTO {
  id: string
  email: string
  name: string
  phone: string | null
  waPhone?: string | null
  source: string
  stage: string
  preferredBrand: string | null
  gender: string | null
  hasActiveCart: boolean
  cartItemCount: number
  estimatedValue: number
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  ctwaClid?: string | null
  optedOut?: boolean
  botPaused?: boolean
  botPausedAt?: string | null
  botPausedUntil?: string | null
  needsHuman?: boolean
  handoffReason?: string | null
  handoffAt?: string | null
  leadRecordId?: string | null
  consentAt?: string | null
  events?: LeadEventItem[]
  createdAt: string
  lastInteraction: string
}

export interface GetLeadsResponse {
  leads: LeadDTO[]
  total: number
  stats: LeadStats
}

function sanitizeEventMetadata(
  metadata?: Record<string, unknown>
): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (/^(email|correo|cedula|document|documento|documentNumber)$/i.test(key)) {
      continue
    }
    cleaned[key] = value
  }
  return cleaned as Prisma.InputJsonValue
}

function generateShortCode(): string {
  return randomBytes(6).toString("base64url").slice(0, 8)
}

/**
 * Crea o actualiza de forma idempotente un lead de WhatsApp por su teléfono normalizado a dígitos.
 * Nunca crea registros User ni almacena correo o cédula.
 */
export function isLeadBotPausedNow(
  lead: { botPaused?: boolean | null; botPausedUntil?: Date | string | null } | null | undefined,
  now: Date = new Date()
): boolean {
  if (!lead) return false
  if (lead.botPaused) return true
  if (!lead.botPausedUntil) return false
  const until =
    lead.botPausedUntil instanceof Date
      ? lead.botPausedUntil
      : new Date(lead.botPausedUntil)
  return Number.isFinite(until.getTime()) && until.getTime() > now.getTime()
}

export async function upsertLeadByPhone(input: {
  waPhone: string
  name?: string | null
  ctwaClid?: string | null
  consent?: boolean
  optedOut?: boolean
  botPausedUntil?: string | null
  needsHuman?: boolean
  handoffReason?: string | null
}) {
  const digits = normalizeWaPhone(input.waPhone)
  if (digits.length < 7 || digits.length > 15) {
    throw new Error("El número waPhone debe tener entre 7 y 15 dígitos.")
  }

  const now = new Date()
  const parsedPausedUntil =
    input.botPausedUntil === undefined
      ? undefined
      : input.botPausedUntil === null
        ? null
        : new Date(input.botPausedUntil)

  const lead = await upsertLeadRecord({
    waPhone: digits,
    name: input.name ? input.name.trim() : undefined,
    ctwaClid: input.ctwaClid ? input.ctwaClid.trim() : undefined,
    consentAt: input.consent === true ? now : undefined,
    optedOut: input.optedOut,
    optedOutAt: input.optedOut === true ? now : input.optedOut === false ? null : undefined,
    botPausedUntil: parsedPausedUntil,
    needsHuman: input.needsHuman,
    handoffReason: input.handoffReason ? input.handoffReason.trim() : undefined,
    handoffAt: input.needsHuman === true ? now : input.needsHuman === false ? null : undefined,
    source: "WHATSAPP",
  })

  const eventType =
    input.optedOut === true
      ? "OPT_OUT"
      : input.needsHuman === true
        ? "HANDOFF_REQUESTED"
        : input.botPausedUntil
          ? "BOT_AUTO_PAUSED"
          : "LEAD_UPSERTED"

  await createLeadEventRecord({
    leadId: lead.id,
    type: eventType,
    stage: lead.stage,
    metadata: sanitizeEventMetadata({
      ...(input.ctwaClid ? { ctwaClid: input.ctwaClid } : {}),
      ...(input.consent !== undefined ? { consent: input.consent } : {}),
      ...(input.optedOut !== undefined ? { optedOut: input.optedOut } : {}),
      ...(input.botPausedUntil !== undefined ? { botPausedUntil: input.botPausedUntil } : {}),
      ...(input.needsHuman !== undefined ? { needsHuman: input.needsHuman } : {}),
      ...(input.handoffReason ? { handoffReason: input.handoffReason.trim() } : {}),
    }),
  })

  return {
    id: lead.id,
    waPhone: lead.waPhone,
    name: lead.name,
    stage: lead.stage,
    ctwaClid: lead.ctwaClid,
    consentAt: lead.consentAt ? lead.consentAt.toISOString() : null,
    optedOut: lead.optedOut,
    botPaused: Boolean(lead.botPaused),
    botPausedAt: lead.botPausedAt ? lead.botPausedAt.toISOString() : null,
    botPausedUntil: lead.botPausedUntil ? lead.botPausedUntil.toISOString() : null,
    needsHuman: Boolean(lead.needsHuman),
    handoffReason: lead.handoffReason ?? null,
    handoffAt: lead.handoffAt ? lead.handoffAt.toISOString() : null,
  }
}

export async function getWhatsappBotGlobalEnabled(): Promise<boolean> {
  return getWhatsappBotEnabledRecord()
}

export async function setWhatsappBotGlobalEnabled(enabled: boolean): Promise<boolean> {
  const updated = await updateStoreSettingsRecord({ whatsappBotEnabled: enabled })
  return Boolean(updated.whatsappBotEnabled)
}

/**
 * Consulta si el bot de WhatsApp debe responder a un número dado.
 * Responde solo cuando el suiche global está encendido, el lead no está pausado
 * (ni manualmente ni por pausa automática vigente) y el cliente no pidió la baja (optedOut).
 */
export async function getWhatsappBotStatusForPhone(waPhone: string) {
  const digits = normalizeWaPhone(waPhone)
  const [botGlobalEnabled, lead] = await Promise.all([
    getWhatsappBotEnabledRecord(),
    digits.length >= 7 ? findLeadByPhone(digits) : Promise.resolve(null),
  ])

  const pausedNow = isLeadBotPausedNow(lead)
  const optedOut = Boolean(lead?.optedOut)

  return {
    botGlobalEnabled,
    lead: lead
      ? {
          id: lead.id,
          waPhone: lead.waPhone,
          name: lead.name,
          stage: lead.stage,
          optedOut,
          botPaused: Boolean(lead.botPaused),
          botPausedAt: lead.botPausedAt ? lead.botPausedAt.toISOString() : null,
          botPausedUntil: lead.botPausedUntil ? lead.botPausedUntil.toISOString() : null,
          needsHuman: Boolean(lead.needsHuman),
          handoffReason: lead.handoffReason ?? null,
          handoffAt: lead.handoffAt ? lead.handoffAt.toISOString() : null,
        }
      : null,
    shouldRespond: botGlobalEnabled && !pausedNow && !optedOut,
  }
}

/**
 * Apaga o prende el bot de WhatsApp manualmente para un lead puntual.
 * Al prenderlo (`paused: false`) limpia también cualquier pausa automática vigente y la alerta de traspaso.
 */
export async function setLeadBotPaused(leadId: string, paused: boolean) {
  const cleanId = leadId.replace(/^wa_/, "").trim()
  if (!cleanId) {
    throw new Error("Identificador de lead inválido.")
  }

  const existing = await findLeadById(cleanId)
  if (!existing) {
    throw new Error("Lead de WhatsApp no encontrado.")
  }

  const updated = await updateLeadBotPausedRecord(cleanId, paused)
  await createLeadEventRecord({
    leadId: cleanId,
    type: paused ? "BOT_PAUSED" : "BOT_RESUMED",
    stage: updated.stage,
    metadata: sanitizeEventMetadata({ botPaused: paused }),
  })

  return {
    id: updated.id,
    botPaused: Boolean(updated.botPaused),
    botPausedAt: updated.botPausedAt ? updated.botPausedAt.toISOString() : null,
    botPausedUntil: updated.botPausedUntil ? updated.botPausedUntil.toISOString() : null,
    needsHuman: Boolean(updated.needsHuman),
  }
}

/**
 * Marca como atendida la solicitud de asesora en el dashboard sin modificar la pausa del bot.
 */
export async function resolveLeadHandoff(leadId: string) {
  const cleanId = leadId.replace(/^wa_/, "").trim()
  if (!cleanId) {
    throw new Error("Identificador de lead inválido.")
  }

  const existing = await findLeadById(cleanId)
  if (!existing) {
    throw new Error("Lead de WhatsApp no encontrado.")
  }

  const updated = await resolveLeadHandoffRecord(cleanId)
  await createLeadEventRecord({
    leadId: cleanId,
    type: "HANDOFF_RESOLVED",
    stage: updated.stage,
  })

  return {
    id: updated.id,
    needsHuman: false,
  }
}

export interface PendingHandoffDTO {
  id: string
  waPhone: string
  name: string
  handoffReason: string | null
  handoffAt: string | null
  botPaused: boolean
  botPausedUntil: string | null
  stage: string
}

export async function getPendingWhatsappHandoffs(limit = 10): Promise<PendingHandoffDTO[]> {
  const rows = await findPendingHandoffLeads(limit)
  return rows.map((row) => ({
    id: row.id,
    waPhone: row.waPhone,
    name: row.name || "Prospecto WhatsApp",
    handoffReason: row.handoffReason ?? null,
    handoffAt: row.handoffAt ? row.handoffAt.toISOString() : null,
    botPaused: Boolean(row.botPaused),
    botPausedUntil: row.botPausedUntil ? row.botPausedUntil.toISOString() : null,
    stage: String(row.stage),
  }))
}

export async function getPendingWhatsappHandoffCount(): Promise<number> {
  return countPendingHandoffLeads()
}

/**
 * Avanza la etapa de un lead solo hacia adelante; COMPRO nunca retrocede.
 */
export async function advanceStage(
  leadIdOrPhone: string,
  nextStage: LeadStage,
  metadata?: Record<string, unknown>
) {
  const trimmed = leadIdOrPhone.trim()
  if (!trimmed) return null

  const lead = (await findLeadById(trimmed)) ?? (await findLeadByPhone(trimmed))
  if (!lead) return null

  if (!canAdvanceLeadStage(lead.stage, nextStage)) {
    return lead
  }

  const updated = await updateLeadStageRecord(lead.id, nextStage)
  await createLeadEventRecord({
    leadId: lead.id,
    type: "STAGE_CHANGE",
    stage: nextStage,
    metadata: sanitizeEventMetadata({
      from: lead.stage,
      to: nextStage,
      ...(metadata ?? {}),
    }),
  })

  return updated
}

/**
 * Registra un evento en la línea de tiempo del lead y opcionalmente avanza su etapa.
 */
export async function recordLeadEvent(input: {
  leadId?: string
  waPhone?: string
  type: string
  stage?: LeadStage
  metadata?: Record<string, unknown>
}) {
  let lead = input.leadId ? await findLeadById(input.leadId) : null
  if (!lead && input.waPhone) {
    const digits = normalizeWaPhone(input.waPhone)
    lead = await findLeadByPhone(digits)
    if (!lead && digits.length >= 7) {
      lead = await upsertLeadRecord({ waPhone: digits, source: "WHATSAPP" })
    }
  }

  if (!lead) {
    throw new Error("Lead no encontrado para registrar evento.")
  }

  const event = await createLeadEventRecord({
    leadId: lead.id,
    type: input.type.trim(),
    stage: input.stage ?? lead.stage,
    metadata: sanitizeEventMetadata(input.metadata),
  })

  let currentStage = lead.stage
  if (input.stage && canAdvanceLeadStage(lead.stage, input.stage)) {
    const updated = await updateLeadStageRecord(lead.id, input.stage)
    currentStage = updated.stage
  }

  return {
    eventId: event.id,
    leadId: lead.id,
    stage: currentStage,
  }
}

/**
 * Vincula un pedido (`Order.leadId`) con el lead resuelto por `leadId` (cookie `os_lead`)
 * o en su defecto por `waPhone` (teléfono del pedido), y opcionalmente avanza su etapa.
 */
export async function linkOrderToLead(
  orderId: string,
  options?: {
    leadId?: string | null
    waPhone?: string | null
    advanceToStage?: LeadStage
  }
) {
  let lead = options?.leadId ? await findLeadById(options.leadId) : null
  if (!lead && options?.waPhone) {
    lead = await findLeadByPhone(options.waPhone)
  }
  if (!lead) return null

  await attachLeadToOrderRecord(orderId, lead.id)

  if (options?.advanceToStage) {
    lead = (await advanceStage(lead.id, options.advanceToStage, { orderId })) ?? lead
  }

  return lead
}

/**
 * Crea un enlace corto `/r/<code>` para un lead de WhatsApp hacia un producto,
 * guardando atribución UTM base y avanzando a INTERESADO.
 */
export async function createShortLink(input: {
  waPhone: string
  productSlug: string
  utmCampaign?: string | null
  name?: string | null
  baseUrl?: string
}) {
  const digits = normalizeWaPhone(input.waPhone)
  if (digits.length < 7 || digits.length > 15) {
    throw new Error("El número waPhone debe tener entre 7 y 15 dígitos.")
  }

  const cleanSlug = extractProductSlug(input.productSlug)
  if (!cleanSlug) {
    throw new Error("El slug del producto es requerido.")
  }

  const lead = await upsertLeadRecord({
    waPhone: digits,
    name: input.name ? input.name.trim() : undefined,
    source: "WHATSAPP",
  })

  const shortCode = lead.shortCode || generateShortCode()
  const utmCampaign = input.utmCampaign?.trim() || "asistente_wa"

  await updateLeadShortLinkRecord(lead.id, {
    shortCode,
    productSlug: cleanSlug,
    utmSource: "whatsapp",
    utmMedium: "asistente",
    utmCampaign,
    utmContent: shortCode,
  })

  await advanceStage(lead.id, "INTERESADO", { productSlug: cleanSlug, shortCode })

  await createLeadEventRecord({
    leadId: lead.id,
    type: "SHORT_LINK_CREATED",
    stage: canAdvanceLeadStage(lead.stage, "INTERESADO") ? "INTERESADO" : lead.stage,
    metadata: sanitizeEventMetadata({
      shortCode,
      productSlug: cleanSlug,
      utmCampaign,
    }),
  })

  const base = (input.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://onestar.com.co").replace(
    /\/+$/,
    ""
  )

  return {
    url: `${base}/r/${shortCode}`,
    code: shortCode,
    leadId: lead.id,
  }
}

/**
 * Resuelve el clic en `/r/[code]`: guarda UTM, registra LINK_CLICK, avanza etapa
 * y construye la URL de redirección 302 con parámetros UTM.
 * Si el código es desconocido, redirige al producto/catálogo sin lanzar error.
 */
export async function resolveShortLinkClick(
  code: string,
  options?: {
    utmCampaign?: string | null
    fallbackProductSlug?: string | null
    baseUrl?: string
  }
): Promise<{
  found: boolean
  leadId: string | null
  redirectUrl: string
}> {
  const base = (options?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://onestar.com.co").replace(
    /\/+$/,
    ""
  )
  const cleanCode = code.trim()
  const lead = cleanCode ? await findLeadByShortCode(cleanCode) : null

  if (!lead) {
    const slug = options?.fallbackProductSlug ? extractProductSlug(options.fallbackProductSlug) : ""
    const targetPath = slug ? `/productos/${slug}` : "/productos"
    const fallbackUrl = new URL(`${base}${targetPath}`)
    fallbackUrl.searchParams.set("utm_source", "whatsapp")
    fallbackUrl.searchParams.set("utm_medium", "asistente")
    if (options?.utmCampaign) {
      fallbackUrl.searchParams.set("utm_campaign", options.utmCampaign)
    }
    if (cleanCode) {
      fallbackUrl.searchParams.set("utm_content", cleanCode)
    }
    return {
      found: false,
      leadId: null,
      redirectUrl: fallbackUrl.toString(),
    }
  }

  const utmCampaign = options?.utmCampaign?.trim() || lead.utmCampaign || "asistente_wa"
  const productSlug =
    lead.productSlug ||
    (options?.fallbackProductSlug ? extractProductSlug(options.fallbackProductSlug) : "")

  await updateLeadUtmRecord(lead.id, {
    utmSource: "whatsapp",
    utmMedium: "asistente",
    utmCampaign,
    utmContent: cleanCode,
  })

  await advanceStage(lead.id, "INTERESADO", { shortCode: cleanCode, productSlug })

  await createLeadEventRecord({
    leadId: lead.id,
    type: "LINK_CLICK",
    stage: canAdvanceLeadStage(lead.stage, "INTERESADO") ? "INTERESADO" : lead.stage,
    metadata: sanitizeEventMetadata({
      shortCode: cleanCode,
      productSlug: productSlug || null,
      utmSource: "whatsapp",
      utmMedium: "asistente",
      utmCampaign,
      utmContent: cleanCode,
    }),
  })

  const targetPath = productSlug ? `/productos/${productSlug}` : "/productos"
  const redirectUrl = new URL(`${base}${targetPath}`)
  redirectUrl.searchParams.set("utm_source", "whatsapp")
  redirectUrl.searchParams.set("utm_medium", "asistente")
  redirectUrl.searchParams.set("utm_campaign", utmCampaign)
  redirectUrl.searchParams.set("utm_content", cleanCode)

  return {
    found: true,
    leadId: lead.id,
    redirectUrl: redirectUrl.toString(),
  }
}

/**
 * Marca como ABANDONO los leads sin pago aprobado tras 24 horas desde su última interacción.
 */
export async function markAbandonedLeads(now: Date = new Date()): Promise<string[]> {
  const before = new Date(now.getTime() - ABANDONED_LEAD_TTL_HOURS * 60 * 60 * 1000)
  const staleLeads = await findStaleLeadsForAbandonment(before)
  const abandonedIds: string[] = []

  for (const item of staleLeads) {
    const updated = await advanceStage(item.id, "ABANDONO", {
      reason: "24h_without_payment",
    })
    if (updated && updated.stage === "ABANDONO") {
      abandonedIds.push(item.id)
    }
  }

  return abandonedIds
}

export async function getLeadsList(params: {
  q?: string
  source?: "ALL" | "WHATSAPP" | "CLUB" | "ABANDONED_CART" | "REGISTERED_NO_ORDER"
  stage?: string
  utm?: string
  hasPhone?: boolean
  needsHumanOnly?: boolean
  page?: number
  pageSize?: number
}): Promise<GetLeadsResponse> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.max(1, params.pageSize ?? 25)
  const skip = (page - 1) * pageSize

  const filter: LeadFilterParams = {
    q: params.q,
    source: params.source,
    hasPhone: params.hasPhone,
    needsHumanOnly: params.needsHumanOnly,
    ...(params.stage ? { stage: params.stage } : {}),
    ...(params.utm ? { utm: params.utm } : {}),
    take: pageSize,
    skip,
  }

  const result = await getLeadsData(filter)

  return {
    leads: result.leads,
    total: result.total,
    stats: result.stats,
  }
}

/** Neutraliza fórmulas maliciosas de Excel/Calc (CWE-1236) y escapa comillas dobles. */
function csvCell(value: string | null | undefined): string {
  if (!value) return '""'
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

/**
 * Genera contenido en formato CSV para exportar leads hacia campañas de WhatsApp o CRM externo.
 * Incluye waPhone, UTM y etapa, excluyendo siempre los leads dados de baja (optedOut).
 */
export async function exportLeadsToCsv(): Promise<string> {
  const result = await getLeadsData({ take: 5000, skip: 0 })
  const activeLeads = result.leads.filter((l) => !l.optedOut)

  const headers = [
    "ID",
    "Email",
    "Nombre",
    "Telefono",
    "waPhone",
    "Origen",
    "Etapa",
    "UTM Source",
    "UTM Medium",
    "UTM Campaign",
    "UTM Content",
    "Marca Preferida",
    "Genero",
    "Items en Carrito",
    "Valor Estimado",
    "Fecha Registro",
  ]

  const rows = activeLeads.map((l) => [
    csvCell(l.id),
    csvCell(l.email),
    csvCell(l.name),
    csvCell(l.phone),
    csvCell(l.waPhone ?? l.phone),
    csvCell(l.source),
    csvCell(l.stage),
    csvCell(l.utmSource),
    csvCell(l.utmMedium),
    csvCell(l.utmCampaign),
    csvCell(l.utmContent),
    csvCell(l.preferredBrand),
    csvCell(l.gender),
    l.cartItemCount,
    l.estimatedValue,
    csvCell(l.createdAt),
  ])

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
}
