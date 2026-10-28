import "server-only"

import { createHash } from "node:crypto"
import { isIP } from "node:net"
import {
  consumeRequestRateLimit,
  removeExpiredRequestRateLimits,
} from "@/server/repositories/request-rate-limit.repository"

let lastPruneAt = 0
const PRUNE_INTERVAL_MS = 60 * 60 * 1_000

function trustedClientIp(headers: Headers): string {
  const candidate = headers.get("x-real-ip")?.trim() ?? ""
  return isIP(candidate) ? candidate : "unknown"
}

function keyFor(bucket: string, ip: string, subject?: string): string {
  return createHash("sha256")
    .update(bucket)
    .update("\0")
    .update(ip)
    .update("\0")
    .update(subject?.trim().toLowerCase() ?? "")
    .digest("base64url")
}

/**
 * Database-backed fixed-window limiter. The proxy is the trust boundary and
 * must overwrite X-Real-IP; X-Forwarded-For is intentionally ignored.
 */
export async function consumePublicRateLimit(
  bucket: string,
  headers: Headers,
  { max, windowMs, subject }: { max: number; windowMs: number; subject?: string }
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = Date.now()
  if (now - lastPruneAt >= PRUNE_INTERVAL_MS) {
    lastPruneAt = now
    void removeExpiredRequestRateLimits().catch((error) =>
      console.error("[public-rate-limit] cleanup failed", error)
    )
  }

  const record = await consumeRequestRateLimit(keyFor(bucket, trustedClientIp(headers), subject), windowMs)
  if (record.count <= max) return { allowed: true }

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt.getTime() - now) / 1_000)),
  }
}
