import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma } from "@prisma/client"

export async function createErpSyncLog(data: Prisma.ErpSyncLogCreateInput) {
  return prisma.erpSyncLog.create({ data })
}

export async function findRecentErpSyncLogs(limit = 10) {
  return prisma.erpSyncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}
