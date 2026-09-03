import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma } from "@prisma/client"

export async function getActiveNavigationItems() {
  return prisma.navigationItem.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
  });
}

export async function getAllNavigationItems() {
  return prisma.navigationItem.findMany({
    orderBy: { position: "asc" },
  })
}

export async function getMaximumNavigationPosition(): Promise<number> {
  const result = await prisma.navigationItem.aggregate({ _max: { position: true } })
  return result._max.position ?? 0
}

export async function createNavigationItem(data: Prisma.NavigationItemCreateInput) {
  return prisma.navigationItem.create({ data })
}

export async function updateNavigationItem(id: string, data: Prisma.NavigationItemUpdateInput) {
  return prisma.navigationItem.update({ where: { id }, data })
}

export async function deleteNavigationItem(id: string) {
  return prisma.navigationItem.delete({ where: { id } })
}

export async function updateNavigationPositions(updates: { id: string; position: number }[]) {
  await prisma.$transaction(
    updates.map(({ id, position }) =>
      prisma.navigationItem.update({ where: { id }, data: { position } })
    )
  )
}
