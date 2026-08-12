import "server-only"
import { prisma } from "../db/prisma"
import type { LandingSection } from "@prisma/client"

export async function getActiveLandingSections(): Promise<LandingSection[]> {
  return prisma.landingSection.findMany({
    where: { isActive: true },
    // `createdAt` como desempate estable: si dos secciones comparten posición
    // (p. ej. por una inserción externa), el orden de render es determinista.
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  })
}

export async function getAllLandingSections(): Promise<LandingSection[]> {
  return prisma.landingSection.findMany({
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
