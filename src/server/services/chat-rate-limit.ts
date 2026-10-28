/** Límite en memoria por IP. Se reinicia si el proceso se reinicia. */
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
