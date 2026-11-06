import "server-only"
import { prisma } from "@/server/db/prisma"

export interface EmailTemplateSettingRow {
  key: string
  subject: string | null
  intro: string | null
  enabled: boolean
  updatedAt: Date
}

export function findEmailTemplateSetting(key: string): Promise<EmailTemplateSettingRow | null> {
  return prisma.emailTemplateSetting.findUnique({ where: { key } })
}

export function findAllEmailTemplateSettings(): Promise<EmailTemplateSettingRow[]> {
  return prisma.emailTemplateSetting.findMany()
}

export function upsertEmailTemplateSetting(
  key: string,
  data: { subject: string | null; intro: string | null; enabled: boolean }
): Promise<EmailTemplateSettingRow> {
  return prisma.emailTemplateSetting.upsert({
    where: { key },
    create: { key, ...data },
    update: data,
  })
}
