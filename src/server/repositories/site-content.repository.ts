import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma } from "@prisma/client"

export async function findSiteContent() {
  return prisma.siteContent.findUnique({
    where: { id: "default" },
  })
}

export async function upsertSiteContentRecord(data: Prisma.SiteContentUpdateInput) {
  return prisma.siteContent.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      highlights: (data.highlights as string[]) ?? [],
      faqs: data.faqs as Prisma.InputJsonValue,
      promises: data.promises as Prisma.InputJsonValue,
      returnWindowDays: (data.returnWindowDays as number) ?? 30,
    },
    update: data,
  })
}
