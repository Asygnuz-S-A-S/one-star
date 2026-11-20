import "server-only"
import type { Prisma, WebEventType } from "@prisma/client"
import { prisma } from "../db/prisma"

export interface UpsertWebVisitorInput {
  anonId: string
  landingPath: string | null
  referrer: string | null
  device: string | null
  utm: {
    source: string | null
    medium: string | null
    campaign: string | null
    content: string | null
    term: string | null
  }
}

/**
 * Crea el visitante en su primera visita o solo refresca `lastSeenAt` en las
 * siguientes. Los datos de primer toque (landing, referrer, UTMs) NO se
 * sobrescriben: sirven para saber por dónde entró originalmente.
 */
export async function upsertWebVisitor(input: UpsertWebVisitorInput) {
  return prisma.webVisitor.upsert({
    where: { anonId: input.anonId },
    create: {
      anonId: input.anonId,
      landingPath: input.landingPath,
      referrer: input.referrer,
      device: input.device,
      utmSource: input.utm.source,
      utmMedium: input.utm.medium,
      utmCampaign: input.utm.campaign,
      utmContent: input.utm.content,
      utmTerm: input.utm.term,
    },
    update: { lastSeenAt: new Date() },
    select: { id: true },
  })
}

export interface CreateWebEventInput {
  visitorId: string
  sessionId: string
  type: WebEventType
  path: string
  categorySlug: string | null
  productSlug: string | null
  brandSlug: string | null
  searchTerm: string | null
  filters: Prisma.InputJsonValue | undefined
}

export async function createWebEvent(input: CreateWebEventInput) {
  return prisma.webEvent.create({
    data: {
      visitorId: input.visitorId,
      sessionId: input.sessionId,
      type: input.type,
      path: input.path,
      categorySlug: input.categorySlug,
      productSlug: input.productSlug,
      brandSlug: input.brandSlug,
      searchTerm: input.searchTerm,
      ...(input.filters === undefined ? {} : { filters: input.filters }),
    },
    select: { id: true },
  })
}

/** Vincula el visitante anónimo con la persona real cuando se identifica. */
export async function linkWebVisitorIdentity(
  anonId: string,
  identity: { userId?: string; leadId?: string },
) {
  return prisma.webVisitor.updateMany({
    where: { anonId },
    data: identity,
  })
}

export interface TopSlugRow {
  slug: string
  visits: number
}

/** Categorías más vistas en una ventana de días. Alimenta el retargeting. */
export async function findTopCategories(days: number, limit: number): Promise<TopSlugRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const rows = await prisma.webEvent.groupBy({
    by: ["categorySlug"],
    where: {
      categorySlug: { not: null },
      occurredAt: { gte: since },
      type: { in: ["CATEGORY_VIEW", "FILTER_APPLY"] },
    },
    _count: { _all: true },
    orderBy: { _count: { categorySlug: "desc" } },
    take: limit,
  })

  return rows.map((row) => ({
    slug: row.categorySlug ?? "",
    visits: row._count._all,
  }))
}

/** Eventos de filtro de los últimos días, para contar qué se filtra más. */
export async function findRecentFilterEvents(days: number, limit: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return prisma.webEvent.findMany({
    where: { type: "FILTER_APPLY", occurredAt: { gte: since } },
    select: { filters: true },
    take: limit,
  })
}

/** Retención: borra lo más viejo que la ventana configurada. */
export async function deleteWebEventsOlderThan(cutoff: Date) {
  const result = await prisma.webEvent.deleteMany({ where: { occurredAt: { lt: cutoff } } })
  return result.count
}

// ---------------------------------------------------------------------------
// Consultas agregadas del panel de analítica (`/admin/analitica`).
// Son de solo lectura y se apoyan en los índices de `WebEvent`:
// (type, occurredAt), (productSlug, occurredAt) y (occurredAt).
// ---------------------------------------------------------------------------

function sinceDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

export interface AnalyticsSummaryRow {
  visitors: number
  sessions: number
  events: number
  productViews: number
}

/** Totales de la ventana: personas, visitas y vistas. */
export async function findAnalyticsSummary(days: number): Promise<AnalyticsSummaryRow> {
  const since = sinceDate(days)
  const [row] = await prisma.$queryRaw<
    { visitors: bigint; sessions: bigint; events: bigint; product_views: bigint }[]
  >`
    SELECT
      count(DISTINCT "visitorId") AS visitors,
      count(DISTINCT "sessionId") AS sessions,
      count(*) AS events,
      count(*) FILTER (WHERE "type" = 'PRODUCT_VIEW') AS product_views
    FROM "WebEvent"
    WHERE "occurredAt" >= ${since}
  `

  return {
    visitors: Number(row?.visitors ?? 0),
    sessions: Number(row?.sessions ?? 0),
    events: Number(row?.events ?? 0),
    productViews: Number(row?.product_views ?? 0),
  }
}

export interface FunnelRow {
  productViewers: number
  checkoutStarters: number
  buyers: number
}

/** Embudo por personas (no por eventos): vieron -> fueron a pagar -> compraron. */
export async function findFunnel(days: number): Promise<FunnelRow> {
  const since = sinceDate(days)
  const [row] = await prisma.$queryRaw<
    { product_viewers: bigint; checkout_starters: bigint; buyers: bigint }[]
  >`
    SELECT
      count(DISTINCT "visitorId") FILTER (WHERE "type" = 'PRODUCT_VIEW')    AS product_viewers,
      count(DISTINCT "visitorId") FILTER (WHERE "type" = 'CHECKOUT_START')  AS checkout_starters,
      count(DISTINCT "visitorId") FILTER (WHERE "type" = 'PURCHASE')        AS buyers
    FROM "WebEvent"
    WHERE "occurredAt" >= ${since}
  `

  return {
    productViewers: Number(row?.product_viewers ?? 0),
    checkoutStarters: Number(row?.checkout_starters ?? 0),
    buyers: Number(row?.buyers ?? 0),
  }
}

export interface TopProductRow {
  slug: string
  views: number
  people: number
}

/** Productos más vistos, con cuántas personas distintas los vieron. */
export async function findTopProducts(days: number, limit: number): Promise<TopProductRow[]> {
  const since = sinceDate(days)
  const rows = await prisma.$queryRaw<{ slug: string; views: bigint; people: bigint }[]>`
    SELECT "productSlug" AS slug, count(*) AS views, count(DISTINCT "visitorId") AS people
    FROM "WebEvent"
    WHERE "type" = 'PRODUCT_VIEW' AND "productSlug" IS NOT NULL AND "occurredAt" >= ${since}
    GROUP BY "productSlug"
    ORDER BY views DESC
    LIMIT ${limit}
  `
  return rows.map((row) => ({ slug: row.slug, views: Number(row.views), people: Number(row.people) }))
}

/**
 * Personas que vieron un producto y nunca llegaron a comprar (en la ventana).
 * Es la lista accionable para retargeting.
 */
export async function findProductsViewedNotPurchased(
  days: number,
  limit: number,
): Promise<TopSlugRow[]> {
  const since = sinceDate(days)
  const rows = await prisma.$queryRaw<{ slug: string; visits: bigint }[]>`
    SELECT v."productSlug" AS slug, count(DISTINCT v."visitorId") AS visits
    FROM "WebEvent" v
    WHERE v."type" = 'PRODUCT_VIEW'
      AND v."productSlug" IS NOT NULL
      AND v."occurredAt" >= ${since}
      AND NOT EXISTS (
        SELECT 1 FROM "WebEvent" p
        WHERE p."visitorId" = v."visitorId"
          AND p."type" = 'PURCHASE'
          AND p."occurredAt" >= ${since}
      )
    GROUP BY v."productSlug"
    ORDER BY visits DESC
    LIMIT ${limit}
  `
  return rows.map((row) => ({ slug: row.slug, visits: Number(row.visits) }))
}

export interface SearchTermRow {
  term: string
  searches: number
}

/** Qué busca la gente en la tienda. */
export async function findTopSearches(days: number, limit: number): Promise<SearchTermRow[]> {
  const since = sinceDate(days)
  const rows = await prisma.webEvent.groupBy({
    by: ["searchTerm"],
    where: { searchTerm: { not: null }, occurredAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { searchTerm: "desc" } },
    take: limit,
  })
  return rows.map((row) => ({ term: row.searchTerm ?? "", searches: row._count._all }))
}

export interface TrafficSourceRow {
  source: string
  medium: string | null
  visitors: number
}

/** De dónde llegaron los visitantes nuevos: UTM de primer toque, o el referrer. */
export async function findTrafficSources(days: number, limit: number): Promise<TrafficSourceRow[]> {
  const since = sinceDate(days)
  const rows = await prisma.$queryRaw<
    { source: string; medium: string | null; visitors: bigint }[]
  >`
    SELECT
      COALESCE(NULLIF("utmSource", ''), NULLIF("referrer", ''), 'directo') AS source,
      NULLIF("utmMedium", '') AS medium,
      count(*) AS visitors
    FROM "WebVisitor"
    WHERE "firstSeenAt" >= ${since}
    GROUP BY 1, 2
    ORDER BY visitors DESC
    LIMIT ${limit}
  `
  return rows.map((row) => ({
    source: row.source,
    medium: row.medium,
    visitors: Number(row.visitors),
  }))
}
