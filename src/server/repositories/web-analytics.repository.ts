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
