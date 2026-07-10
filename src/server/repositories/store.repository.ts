import "server-only"
import { prisma } from "../db/prisma"

export async function findStoreLocations() {
  return prisma.storeLocation.findMany({
    orderBy: { createdAt: "asc" }
  })
}
