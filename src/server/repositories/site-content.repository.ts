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

export async function getCatalogSettingsRecord(): Promise<{ groupColorsInCatalog: boolean }> {
  const envVal = process.env.GROUP_COLORS_IN_CATALOG
  const defaultVal = envVal !== undefined ? (envVal === "true" || envVal === "1") : true
  try {
    const record = await prisma.siteContent.findUnique({
      where: { id: "catalog_settings" },
    })
    if (record?.promises && typeof record.promises === "object" && !Array.isArray(record.promises)) {
      const config = record.promises as Record<string, unknown>
      if (typeof config.groupColorsInCatalog === "boolean") {
        return { groupColorsInCatalog: config.groupColorsInCatalog }
      }
    }
    return { groupColorsInCatalog: defaultVal }
  } catch {
    return { groupColorsInCatalog: defaultVal }
  }
}

export async function upsertCatalogSettingsRecord(config: { groupColorsInCatalog: boolean }) {
  return prisma.siteContent.upsert({
    where: { id: "catalog_settings" },
    create: {
      id: "catalog_settings",
      promises: config as Prisma.InputJsonValue,
    },
    update: {
      promises: config as Prisma.InputJsonValue,
    },
  })
}

