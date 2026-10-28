import "server-only"

import { prisma } from "@/server/db/prisma"

export type RateLimitRecord = { count: number; resetAt: Date }

/** Atomically increments a fixed-window counter shared by every app process. */
export async function consumeRequestRateLimit(
  key: string,
  windowMs: number
): Promise<RateLimitRecord> {
  const resetAt = new Date(Date.now() + windowMs)
  const rows = await prisma.$queryRaw<RateLimitRecord[]>`
    INSERT INTO "RequestRateLimit" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RequestRateLimit"."resetAt" <= NOW() THEN 1
        ELSE "RequestRateLimit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RequestRateLimit"."resetAt" <= NOW() THEN ${resetAt}
        ELSE "RequestRateLimit"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING "count", "resetAt"
  `
  return rows[0]!
}

export async function removeExpiredRequestRateLimits(now = new Date()): Promise<void> {
  await prisma.requestRateLimit.deleteMany({ where: { resetAt: { lte: now } } })
}

export async function findActiveRateLimitExceeded(
  keys: string[],
  minCount: number,
  now = new Date()
): Promise<RateLimitRecord[]> {
  if (keys.length === 0) return []
  return prisma.requestRateLimit.findMany({
    where: {
      key: { in: keys },
      resetAt: { gt: now },
      count: { gte: minCount },
    },
    select: {
      count: true,
      resetAt: true,
    },
  })
}
