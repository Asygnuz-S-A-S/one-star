"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/server/auth/require-admin"
import {
  setLeadBotPaused,
  setWhatsappBotGlobalEnabled,
} from "@/server/services/lead.service"

export interface LeadBotActionResult {
  success: boolean
  botPaused?: boolean
  botGlobalEnabled?: boolean
  error?: string
}

/**
 * Apaga o prende el bot de WhatsApp manualmente para un lead específico.
 * Permitido para Operador de Ventas (ej. asesora) y Super Admin.
 */
export async function toggleLeadBotAction(
  leadId: string,
  paused: boolean
): Promise<LeadBotActionResult> {
  try {
    await requireAdmin("sales")
    const updated = await setLeadBotPaused(leadId, Boolean(paused))
    revalidatePath("/admin/leads")
    return { success: true, botPaused: updated.botPaused }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo actualizar el estado del bot.",
    }
  }
}

/**
 * Suiche global del bot de WhatsApp (apaga o prende el algoritmo para todos los chats).
 * Restringido a Super Admin por afectar a toda la tienda.
 */
export async function toggleWhatsappBotGlobalAction(
  enabled: boolean
): Promise<LeadBotActionResult> {
  try {
    await requireAdmin()
    const botGlobalEnabled = await setWhatsappBotGlobalEnabled(Boolean(enabled))
    revalidatePath("/admin/leads")
    return { success: true, botGlobalEnabled }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo actualizar el suiche global del bot.",
    }
  }
}
