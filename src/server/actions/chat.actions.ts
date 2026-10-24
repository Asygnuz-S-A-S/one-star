"use server"

import { headers } from "next/headers"
import { consumePublicRateLimit } from "@/server/services/public-rate-limit.service"
import { z } from "zod"
import { sendChatMessage, type ChatMessage, type CartAction } from "@/server/services/ai-chat.service"

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
  const rateLimit = await consumePublicRateLimit("chat", headerList, {
    max: 20,
    windowMs: 60_000,
  })
  if (!rateLimit.allowed) {
    return { reply: "", actions: [], error: "Muchos mensajes seguidos. Espera un minuto." }
  }

  const result = await sendChatMessage(parsed.data.history, parsed.data.message)
  return { reply: result.reply, actions: result.actions }
}
