import "server-only"
import { prisma } from "../db/prisma"
import { Prisma, type LandingSection } from "@prisma/client"

export const HOME_LANDING_PAGE = "home"

export async function getActiveLandingSections(page: string = HOME_LANDING_PAGE): Promise<LandingSection[]> {
  return prisma.landingSection.findMany({
    where: { page, isActive: true },
    // `createdAt` como desempate estable: si dos secciones comparten posición
    // (p. ej. por una inserción externa), el orden de render es determinista.
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  })
}

export async function getAllLandingSections(page: string = HOME_LANDING_PAGE): Promise<LandingSection[]> {
  return prisma.landingSection.findMany({
    where: { page },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  })
}

export async function updateLandingSectionPositions(
  updates: { id: string; position: number }[]
): Promise<void> {
  await prisma.$transaction(
    updates.map((update) =>
      prisma.landingSection.update({
        where: { id: update.id },
        data: { position: update.position },
      })
    )
  )
}

export async function getMaximumLandingSectionPosition(page: string = HOME_LANDING_PAGE): Promise<number> {
  const result = await prisma.landingSection.aggregate({ where: { page }, _max: { position: true } })
  return result._max.position ?? 0
}

export async function updateLandingSection(id: string, data: Prisma.LandingSectionUpdateInput) {
  return prisma.landingSection.update({ where: { id }, data })
}

/** Copia el borrador de cada sección de la landing sobre lo publicado y lo limpia. */
export async function publishLandingDrafts(page: string): Promise<number> {
  const sections = await prisma.landingSection.findMany({ where: { page } })
  const drafts = sections.filter((section) => section.draftConfig != null)
  if (drafts.length === 0) return 0
  await prisma.$transaction(
    drafts.map((section) =>
      prisma.landingSection.update({
        where: { id: section.id },
        data: {
          config: section.draftConfig ?? Prisma.DbNull,
          draftConfig: Prisma.DbNull,
        },
      })
    )
  )
  return drafts.length
}

export async function createLandingSection(data: Prisma.LandingSectionCreateInput) {
  return prisma.landingSection.create({ data })
}

export async function deleteLandingSection(id: string) {
  return prisma.landingSection.delete({ where: { id } })
}

export async function getLandingPages(): Promise<string[]> {
  const rows = await prisma.landingSection.findMany({ distinct: ["page"], select: { page: true }, orderBy: { page: "asc" } })
  return rows.map((row) => row.page)
}

export async function findLandingPageSettings(slug: string) {
  return prisma.landingPage.findUnique({ where: { slug } })
}

export async function upsertLandingPageSettings(slug: string, data: { title: string | null; description: string | null; isActive: boolean }) {
  return prisma.landingPage.upsert({ where: { slug }, create: { slug, ...data }, update: data })
}

/** Landings con al menos una sección activa y sin desactivar (las que no tienen fila están activas). */
export async function findPublicLandingPages(): Promise<{ slug: string; updatedAt: Date }[]> {
  const [pages, inactive] = await Promise.all([
    prisma.landingSection.groupBy({ by: ["page"], where: { isActive: true, page: { not: HOME_LANDING_PAGE } }, _max: { updatedAt: true } }),
    prisma.landingPage.findMany({ where: { isActive: false }, select: { slug: true } }),
  ])
  const off = new Set(inactive.map((row) => row.slug))
  return pages.filter((row) => !off.has(row.page)).map((row) => ({ slug: row.page, updatedAt: row._max.updatedAt ?? new Date() }))
}
