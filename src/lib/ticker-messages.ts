/** Segundos que tarda cada mensaje en cruzar la barra superior. Más alto = más lento. */
export const TICKER_SECONDS_DEFAULT = 6
export const TICKER_SECONDS_MIN = 3
export const TICKER_SECONDS_MAX = 30

/** Acota un valor guardado (o ausente) al rango permitido. */
export function clampTickerSeconds(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : TICKER_SECONDS_DEFAULT
  return Math.min(TICKER_SECONDS_MAX, Math.max(TICKER_SECONDS_MIN, n))
}

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
