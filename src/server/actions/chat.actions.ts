"use server"

import { headers } from "next/headers"
import { z } from "zod"
import { sendChatMessage, type ChatMessage, type CartAction } from "@/server/services/ai-chat.service"

/** Rate limiting en memoria por IP (máximo 20 mensajes por IP cada 24 horas). */
const attempts = new Map<string, { count: number; resetAt: number }>()
export const CHAT_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000
export const CHAT_MAX_MESSAGES_PER_IP = 20

export function isChatRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = attempts.get(ip)
  if (record && now < record.resetAt) {
    if (record.count >= CHAT_MAX_MESSAGES_PER_IP) return true
    record.count++
    return false
  }
  attempts.set(ip, { count: 1, resetAt: now + CHAT_RATE_LIMIT_WINDOW_MS })
  return false
}

export function resetChatRateLimitForTesting() {
  attempts.clear()
}

const inputSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(20),
})

export interface SendChatMessageResult {
  reply: string
  actions: CartAction[]
  error?: string
}

export async function sendChatMessageAction(
  history: ChatMessage[],
  message: string
): Promise<SendChatMessageResult> {
  const parsed = inputSchema.safeParse({ message, history })
  if (!parsed.success) {
    return { reply: "", actions: [], error: "Mensaje no válido." }
  }

  const headerList = await headers()
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (isChatRateLimited(ip)) {
    return {
      reply: "",
      actions: [],
      error:
        "Has alcanzado el límite de 20 mensajes. Para continuar tu compra o recibir atención personalizada, escríbenos a nuestro WhatsApp oficial.",
    }
  }

  const result = await sendChatMessage(parsed.data.history, parsed.data.message)
  return { reply: result.reply, actions: result.actions }
}
