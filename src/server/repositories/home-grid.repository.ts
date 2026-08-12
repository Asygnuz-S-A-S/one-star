import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma, HomeGridBlock } from "@prisma/client"

export async function getVisibleGridBlocks(): Promise<HomeGridBlock[]> {
  return prisma.homeGridBlock.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
  })
}

export async function getAllGridBlocks(): Promise<HomeGridBlock[]> {
  return prisma.homeGridBlock.findMany({
    orderBy: { position: "asc" },
  })
}

export async function getGridBlockById(id: string): Promise<HomeGridBlock | null> {
  return prisma.homeGridBlock.findUnique({
    where: { id },
  })
}

export async function createGridBlock(
  data: Prisma.HomeGridBlockCreateInput
): Promise<HomeGridBlock> {
  return prisma.homeGridBlock.create({
    data,
  })
}

export async function updateGridBlock(
  id: string,
  data: Prisma.HomeGridBlockUpdateInput
): Promise<HomeGridBlock> {
  return prisma.homeGridBlock.update({
    where: { id },
    data,
  })
}

export async function deleteGridBlock(id: string): Promise<HomeGridBlock> {
  return prisma.homeGridBlock.delete({
    where: { id },
  })
}

export async function updateGridBlocksPositions(
  updates: { id: string; position: number }[]
): Promise<void> {
  await prisma.$transaction(
    updates.map((update) =>
      prisma.homeGridBlock.update({
        where: { id: update.id },
        data: { position: update.position },
      })
    )
  )
}
