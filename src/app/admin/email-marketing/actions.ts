"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/server/auth/require-admin"
import { getActionError } from "@/server/actions/action-error"
import { syncMarketingToResend, type MarketingSyncResult } from "@/server/services/marketing.service"
import {
  previewEmailTemplate,
  sendEmailTemplateTest,
  updateEmailTemplate,
} from "@/server/services/email-settings.service"

export type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string }

function fail(error: unknown, fallback: string): { success: false; error: string } {
  console.error(`[email-marketing] ${fallback}`, error)
  const zod = getActionError(error, "")
  if (zod) return { success: false, error: zod }
  return { success: false, error: error instanceof Error && error.message.startsWith("Resend") ? error.message : fallback }
}

export async function syncMarketingAction(): Promise<ActionResult<MarketingSyncResult>> {
  try {
    await requireAdmin()
    return { success: true, data: await syncMarketingToResend() }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("Falta RESEND_API_KEY")) return { success: false, error: error.message }
    return fail(error, "No se pudo sincronizar con Resend.")
  }
}

export async function saveEmailTemplateAction(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin()
    await updateEmailTemplate(input)
    revalidatePath("/admin/email-marketing")
    return { success: true }
  } catch (error: unknown) {
    return fail(error, "No se pudo guardar el correo.")
  }
}

export async function previewEmailTemplateAction(input: unknown): Promise<ActionResult<{ subject: string; html: string }>> {
  try {
    await requireAdmin()
    return { success: true, data: previewEmailTemplate(input) }
  } catch (error: unknown) {
    return fail(error, "No se pudo generar la vista previa.")
  }
}

export async function sendEmailTemplateTestAction(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin()
    const result = await sendEmailTemplateTest(input)
    return result.success ? { success: true } : { success: false, error: result.error ?? "Resend no aceptó el correo." }
  } catch (error: unknown) {
    return fail(error, "No se pudo enviar la prueba.")
  }
}
