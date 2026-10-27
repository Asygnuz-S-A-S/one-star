import "server-only"
import { prisma } from "../db/prisma"
import type { LandingSection, Prisma } from "@prisma/client"

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
