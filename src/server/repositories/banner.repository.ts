import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma } from "@prisma/client"

export async function findManyBanners() {
  return prisma.banner.findMany({
    orderBy: { position: "asc" }
  })
}

export async function getActiveBanners() {
  const now = new Date()
  return prisma.banner.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ]
    },
    orderBy: { position: "asc" }
  })
}

export async function createBannerRecord(data: Prisma.BannerCreateInput) {
  return prisma.banner.create({ data })
}

export async function updateBannerRecord(id: string, data: Prisma.BannerUpdateInput) {
  return prisma.banner.update({ where: { id }, data })
}

export async function deleteBannerRecord(id: string) {
  return prisma.banner.delete({ where: { id } })
}
