"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/server/auth/require-admin"
import {
  resolveLeadHandoff,
  setLeadBotPaused,
  setWhatsappBotGlobalEnabled,
} from "@/server/services/lead.service"

export interface LeadBotActionResult {
  success: boolean
  botPaused?: boolean
  botPausedUntil?: string | null
  needsHuman?: boolean
  botGlobalEnabled?: boolean
  error?: string
}

/**
 * Apaga o prende el bot de WhatsApp manualmente para un lead específico.
 * Al prenderlo limpia también la pausa automática de 12 h y la alerta de traspaso.
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
    revalidatePath("/admin")
    return {
      success: true,
      botPaused: updated.botPaused,
      botPausedUntil: updated.botPausedUntil,
      needsHuman: updated.needsHuman,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo actualizar el estado del bot.",
    }
  }
}

/**
 * Marca como atendida la notificación de traspaso a humano en el dashboard.
 * Permitido para Operador de Ventas y Super Admin.
 */
export async function resolveLeadHandoffAction(
  leadId: string
): Promise<LeadBotActionResult> {
  try {
    await requireAdmin("sales")
    await resolveLeadHandoff(leadId)
    revalidatePath("/admin/leads")
    revalidatePath("/admin")
    return { success: true, needsHuman: false }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo marcar el caso como atendido.",
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
    revalidatePath("/admin")
    return { success: true, botGlobalEnabled }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo actualizar el suiche global del bot.",
    }
  }
}
