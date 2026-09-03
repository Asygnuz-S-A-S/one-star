import "server-only"

import { createHash } from "node:crypto"
import { isIP } from "node:net"

const WINDOW_MS = 15 * 60 * 1_000
const MAX_ATTEMPTS = 5
const MAX_UNKNOWN_IP_ATTEMPTS = 20
const MAX_TRACKED_KEYS = 10_000

type AttemptRecord = {
  count: number
  resetAt: number
}

export type AdminLoginAttemptResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

const attempts = new Map<string, AttemptRecord>()

function normalizeIp(ip: string): string {
  const candidate = ip.trim().slice(0, 128)
  return candidate && isIP(candidate) ? candidate : "unknown"
}

function keyFor(normalizedIp: string, email: string): string {
  const normalizedEmail = email.trim().toLowerCase().slice(0, 320)

  return createHash("sha256")
    .update(normalizedIp)
    .update("\u0000")
    .update(normalizedEmail)
    .digest("base64url")
}

function makeRoomForNewKey(now: number): boolean {
  if (attempts.size < MAX_TRACKED_KEYS) return true

  for (const [key, record] of attempts) {
    if (now >= record.resetAt) attempts.delete(key)
  }

  return attempts.size < MAX_TRACKED_KEYS
}

function retryAfterForCapacity(now: number): number {
  let earliestResetAt = Number.POSITIVE_INFINITY
  for (const record of attempts.values()) {
    earliestResetAt = Math.min(earliestResetAt, record.resetAt)
  }

  return Math.max(1, Math.ceil((earliestResetAt - now) / 1_000))
}

export function consumeAdminLoginAttempt(
  ip: string,
  email: string,
  now = Date.now()
): AdminLoginAttemptResult {
  const normalizedIp = normalizeIp(ip)
  const maxAttempts =
    normalizedIp === "unknown" ? MAX_UNKNOWN_IP_ATTEMPTS : MAX_ATTEMPTS
  const key = keyFor(normalizedIp, email)
  const record = attempts.get(key)

  if (!record) {
    if (!makeRoomForNewKey(now)) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterForCapacity(now),
      }
    }
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  if (now >= record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  if (record.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.resetAt - now) / 1_000),
    }
  }

  record.count++
  return { allowed: true }
}

export function resetAdminLoginAttempts(ip: string, email: string): void {
  attempts.delete(keyFor(normalizeIp(ip), email))
}
