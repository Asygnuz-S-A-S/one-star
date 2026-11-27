import "server-only"
import { randomUUID } from "node:crypto"
import type { WebEventType } from "@prisma/client"
import {
  classifyDevice,
  classifyWebEvent,
  normalizePath,
  type ClassifiedWebEvent,
} from "@/lib/analytics/web-events"
import {
  createWebEvent,
  deleteWebEventsOlderThan,
  findAnalyticsSummary,
  findFunnel,
  findProductsViewedNotPurchased,
  findRecentFilterEvents,
  findTopCategories,
  findTopProducts,
  findTopSearches,
  findTrafficSources,
  findUtmCampaignPerformance,
  upsertWebVisitor,
  type AnalyticsSummaryRow,
  type FunnelRow,
  type SearchTermRow,
  type TopProductRow,
  type TopSlugRow,
  type TrafficSourceRow,
  type UtmCampaignRow,
} from "../repositories/web-analytics.repository"

/**
 * Analítica propia: recibe un hit del navegador, resuelve el visitante por su
 * cookie y guarda el evento ya clasificado.
 *
 * Nunca se guarda la IP ni el user-agent completo: solo una etiqueta gruesa de
 * dispositivo. Lo que se registra es navegación anónima; la identidad se
 * vincula aparte, cuando la persona se identifica.
 */

export const VISITOR_COOKIE = "os_vid"
export const SESSION_COOKIE = "os_sid"
/** Un año: mismo horizonte que una audiencia de retargeting. */
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
/** Retención por defecto del histórico de eventos. */
export const DEFAULT_RETENTION_DAYS = 180

export function getWebAnalyticsRetentionDays(): number {
  const raw = process.env.WEB_ANALYTICS_RETENTION_DAYS?.trim()
  if (!raw) return DEFAULT_RETENTION_DAYS
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS
}

/** Elimina eventos web más antiguos que la ventana de retención configurada. */
export async function cleanupOldWebEvents(
  retentionDays = getWebAnalyticsRetentionDays(),
): Promise<number> {
  const days =
    Number.isFinite(retentionDays) && retentionDays > 0
      ? Math.floor(retentionDays)
      : DEFAULT_RETENTION_DAYS
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return deleteWebEventsOlderThan(cutoff)
}

export interface TrackHitInput {
  path: string
  query?: string
  referrer?: string | null
  userAgent?: string | null
  /** Cookies actuales; si faltan, el llamador debe sembrar las que se devuelven. */
  visitorCookie?: string | null
  sessionCookie?: string | null
}

export interface TrackHitResult {
  eventId: string
  classified: ClassifiedWebEvent
  /** Cookies a sembrar en la respuesta (vacío si ya venían). */
  cookiesToSet: Array<{ name: string; value: string; maxAge?: number }>
}

/** Un id de cookie válido: uuid v4 nuestro, nunca algo que mande el cliente. */
function isValidCookieId(value: string | null | undefined): value is string {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function readUtm(query: string): TrackHitInputUtm {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query)
  const pick = (key: string) => {
    const value = params.get(key)?.trim()
    return value && value.length > 0 ? value.slice(0, 200) : null
  }
  return {
    source: pick("utm_source"),
    medium: pick("utm_medium"),
    campaign: pick("utm_campaign"),
    content: pick("utm_content"),
    term: pick("utm_term"),
  }
}

interface TrackHitInputUtm {
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  term: string | null
}

export async function trackWebHit(input: TrackHitInput): Promise<TrackHitResult> {
  const cookiesToSet: TrackHitResult["cookiesToSet"] = []

  let anonId = input.visitorCookie ?? null
  if (!isValidCookieId(anonId)) {
    anonId = randomUUID()
    cookiesToSet.push({ name: VISITOR_COOKIE, value: anonId, maxAge: VISITOR_COOKIE_MAX_AGE })
  }

  let sessionId = input.sessionCookie ?? null
  if (!isValidCookieId(sessionId)) {
    sessionId = randomUUID()
    // Sin maxAge: dura lo que dure la ventana del navegador.
    cookiesToSet.push({ name: SESSION_COOKIE, value: sessionId })
  }

  const query = input.query ?? ""
  const path = normalizePath(input.path)
  const classified = classifyWebEvent(path, query)
  const isFirstHit = cookiesToSet.some((cookie) => cookie.name === VISITOR_COOKIE)

  const visitor = await upsertWebVisitor({
    anonId,
    landingPath: isFirstHit ? path : null,
    referrer: isFirstHit ? (input.referrer?.slice(0, 500) ?? null) : null,
    device: classifyDevice(input.userAgent),
    utm: readUtm(query),
  })

  const event = await createWebEvent({
    visitorId: visitor.id,
    sessionId,
    type: classified.type as WebEventType,
    path,
    categorySlug: classified.categorySlug,
    productSlug: classified.productSlug,
    brandSlug: classified.brandSlug,
    searchTerm: classified.searchTerm,
    filters: classified.filters ?? undefined,
  })

  return { eventId: event.id, classified, cookiesToSet }
}

export interface FilterUsageRow {
  key: string
  value: string
  uses: number
}

/** Qué filtros usa más la gente, desarmando el JSON de cada evento. */
export async function getTopFilters(days = 30, limit = 20): Promise<FilterUsageRow[]> {
  const events = await findRecentFilterEvents(days, 5000)
  const counter = new Map<string, FilterUsageRow>()

  for (const event of events) {
    const filters = event.filters
    if (!filters || typeof filters !== "object" || Array.isArray(filters)) continue
    for (const [key, rawValue] of Object.entries(filters as Record<string, unknown>)) {
      if (typeof rawValue !== "string") continue
      // Un filtro puede traer varios valores: "negro,blanco"
      for (const value of rawValue.split(",")) {
        const clean = value.trim()
        if (clean.length === 0) continue
        const mapKey = `${key}:${clean}`
        const current = counter.get(mapKey)
        if (current) current.uses += 1
        else counter.set(mapKey, { key, value: clean, uses: 1 })
      }
    }
  }

  return [...counter.values()].sort((a, b) => b.uses - a.uses).slice(0, limit)
}

export async function getTopCategories(days = 30, limit = 20): Promise<TopSlugRow[]> {
  return findTopCategories(days, limit)
}

// ---------------------------------------------------------------------------
// Panel de analítica (`/admin/analitica`)
// ---------------------------------------------------------------------------

/** Ventanas que ofrece el panel. Cerrado a propósito: evita consultas enormes. */
export const ANALYTICS_WINDOWS = [1, 7, 30] as const
export type AnalyticsWindow = (typeof ANALYTICS_WINDOWS)[number]
export const DEFAULT_ANALYTICS_WINDOW: AnalyticsWindow = 7

/** Normaliza el parámetro de la URL: cualquier cosa rara cae en la ventana por defecto. */
export function parseAnalyticsWindow(raw: string | undefined | null): AnalyticsWindow {
  const parsed = Number(raw)
  return (ANALYTICS_WINDOWS as readonly number[]).includes(parsed)
    ? (parsed as AnalyticsWindow)
    : DEFAULT_ANALYTICS_WINDOW
}

export interface AnalyticsFunnel extends FunnelRow {
  /** % de quienes vieron producto y llegaron al checkout. */
  viewToCheckout: number
  /** % de quienes empezaron el checkout y compraron. */
  checkoutToPurchase: number
  /** % de quienes vieron producto y terminaron comprando. */
  viewToPurchase: number
}

export interface UtmCampaignPerformance extends UtmCampaignRow {
  /** % de visitantes de la campaña que iniciaron checkout. */
  visitToCheckout: number
  /** % de visitantes de la campaña que terminaron comprando. */
  visitToPurchase: number
}

export interface AnalyticsDashboard {
  days: AnalyticsWindow
  summary: AnalyticsSummaryRow
  funnel: AnalyticsFunnel
  utmCampaigns: UtmCampaignPerformance[]
  topProducts: TopProductRow[]
  viewedNotPurchased: TopSlugRow[]
  topCategories: TopSlugRow[]
  topFilters: FilterUsageRow[]
  topSearches: SearchTermRow[]
  trafficSources: TrafficSourceRow[]
}

function percentage(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 1000) / 10
}

/**
 * Arma el panel completo. Todas las consultas van en paralelo porque son
 * independientes entre sí y de solo lectura.
 */
export async function getAnalyticsDashboard(
  days: AnalyticsWindow = DEFAULT_ANALYTICS_WINDOW,
): Promise<AnalyticsDashboard> {
  const [
    summary,
    funnelRow,
    utmCampaignRows,
    topProducts,
    viewedNotPurchased,
    topCategories,
    topFilters,
    topSearches,
    trafficSources,
  ] = await Promise.all([
    findAnalyticsSummary(days),
    findFunnel(days),
    findUtmCampaignPerformance(days, 25),
    findTopProducts(days, 10),
    findProductsViewedNotPurchased(days, 10),
    findTopCategories(days, 10),
    getTopFilters(days, 10),
    findTopSearches(days, 10),
    findTrafficSources(days, 10),
  ])

  return {
    days,
    summary,
    funnel: {
      ...funnelRow,
      viewToCheckout: percentage(funnelRow.checkoutStarters, funnelRow.productViewers),
      checkoutToPurchase: percentage(funnelRow.buyers, funnelRow.checkoutStarters),
      viewToPurchase: percentage(funnelRow.buyers, funnelRow.productViewers),
    },
    utmCampaigns: utmCampaignRows.map((row) => ({
      ...row,
      visitToCheckout: percentage(row.checkoutStarters, row.visitors),
      visitToPurchase: percentage(row.buyers, row.visitors),
    })),
    topProducts,
    viewedNotPurchased,
    topCategories,
    topFilters,
    topSearches,
    trafficSources,
  }
}
