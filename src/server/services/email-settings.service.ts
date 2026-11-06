import "server-only"

import { EMAIL_CATALOG, getCatalogEntry, type EmailKey } from "@/server/email/catalog"
import type { EmailCopy } from "@/server/email/templates"
import { sendEmail, type SendEmailResult } from "@/server/email/resend.client"
import {
  findAllEmailTemplateSettings,
  findEmailTemplateSetting,
  upsertEmailTemplateSetting,
} from "@/server/repositories/email-template-setting.repository"
import {
  emailPreviewSchema,
  emailTemplateUpdateSchema,
  emailTestSchema,
} from "@/server/validators/email-template.validator"

export interface EmailSettings {
  enabled: boolean
  copy: EmailCopy
}

/**
 * Ajustes de un correo automático. Si la base falla, se usan los textos del
 * código y el correo sale igual: un ajuste nunca debe frenar un correo de compra.
 */
export async function getEmailSettings(key: EmailKey): Promise<EmailSettings> {
  const entry = getCatalogEntry(key)
  const row = await findEmailTemplateSetting(key).catch((error: unknown) => {
    console.error(`[email] No se pudieron leer los ajustes de "${key}":`, error)
    return null
  })
  return {
    // Los obligatorios no se pueden apagar aunque la fila diga lo contrario.
    enabled: entry?.toggleable ? (row?.enabled ?? true) : true,
    copy: entry?.textEditable ? { subject: row?.subject, intro: row?.intro } : {},
  }
}

export interface EmailTemplateAdminItem {
  key: EmailKey
  label: string
  trigger: string
  audience: "cliente" | "interno"
  toggleable: boolean
  textEditable: boolean
  textNote?: string
  placeholders: string[]
  enabled: boolean
  subject: string
  intro: string
  defaultSubject: string
  updatedAt: string | null
}

export async function listEmailTemplatesForAdmin(): Promise<EmailTemplateAdminItem[]> {
  const rows = new Map((await findAllEmailTemplateSettings()).map((row) => [row.key, row]))
  return EMAIL_CATALOG.map((entry) => {
    const row = rows.get(entry.key)
    return {
      key: entry.key,
      label: entry.label,
      trigger: entry.trigger,
      audience: entry.audience,
      toggleable: entry.toggleable,
      textEditable: entry.textEditable,
      textNote: entry.textNote,
      placeholders: entry.placeholders,
      enabled: entry.toggleable ? (row?.enabled ?? true) : true,
      subject: row?.subject ?? "",
      intro: row?.intro ?? "",
      defaultSubject: entry.sample().subject,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    }
  })
}

export async function updateEmailTemplate(input: unknown): Promise<void> {
  const data = emailTemplateUpdateSchema.parse(input)
  const entry = getCatalogEntry(data.key)!
  await upsertEmailTemplateSetting(data.key, {
    subject: entry.textEditable ? data.subject : null,
    intro: entry.textEditable ? data.intro : null,
    enabled: entry.toggleable ? data.enabled : true,
  })
}

/** Vista previa con datos de ejemplo. `copy` permite ver cambios aún sin guardar. */
export function renderEmailPreview(key: EmailKey, copy?: EmailCopy): { subject: string; html: string } {
  const entry = getCatalogEntry(key)
  if (!entry) throw new Error("Correo desconocido.")
  return entry.sample(entry.textEditable ? copy : undefined)
}

/** Vista previa desde el admin (valida la entrada). */
export function previewEmailTemplate(input: unknown): { subject: string; html: string } {
  const { key, subject, intro } = emailPreviewSchema.parse(input)
  return renderEmailPreview(key, { subject, intro })
}

/** Envía la versión guardada del correo, con datos de ejemplo, al correo indicado. */
export async function sendEmailTemplateTest(input: unknown): Promise<SendEmailResult> {
  const { key, to } = emailTestSchema.parse(input)
  const { copy } = await getEmailSettings(key)
  const { subject, html } = renderEmailPreview(key, copy)
  return sendEmail({ to, subject: `[PRUEBA] ${subject}`, html })
}
