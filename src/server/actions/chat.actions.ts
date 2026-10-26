"use server"

import { isIP } from "node:net"
import { headers } from "next/headers"
import { z } from "zod"
import { sendChatMessage, type ChatMessage, type CartAction } from "@/server/services/ai-chat.service"
import { isChatRateLimited } from "@/server/services/chat-rate-limit"

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
  const trustedIp = headerList.get("x-real-ip")?.trim() ?? ""
  const ip = isIP(trustedIp) ? trustedIp : "unknown"
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
