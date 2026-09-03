export interface TickerMessage {
  text: string
  url?: string
}

export function normalizeTickerMessages(value: unknown): TickerMessage[] {
  if (!Array.isArray(value)) return []

  return value.flatMap(message => {
    if (!message || typeof message !== "object") return []
    const candidate = message as { text?: unknown; url?: unknown }
    if (typeof candidate.text !== "string" || candidate.text.trim().length === 0) return []

    return [{
      text: candidate.text,
      ...(typeof candidate.url === "string" && candidate.url.length > 0
        ? { url: candidate.url }
        : {}),
    }]
  })
}

export function reorderTickerMessages(
  messages: TickerMessage[],
  index: number,
  direction: -1 | 1,
): TickerMessage[] {
  const destination = index + direction
  if (index < 0 || index >= messages.length || destination < 0 || destination >= messages.length) {
    return messages
  }

  const reordered = [...messages]
  const [message] = reordered.splice(index, 1)
  reordered.splice(destination, 0, message)
  return reordered
}
