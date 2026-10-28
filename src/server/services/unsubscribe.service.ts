import "server-only"

import { createHmac } from "node:crypto"
import { prisma } from "@/server/db/prisma"

const UNLINK_SECRET = process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET || "onestar-unsubscribe-secret-salt"

export function createUnsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase()
  const payload = Buffer.from(JSON.stringify({ email: normalized, t: Date.now() })).toString("base64url")
  const signature = createHmac("sha256", UNLINK_SECRET).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const [payload, signature] = token.split(".")
    if (!payload || !signature) return null

    const expectedSignature = createHmac("sha256", UNLINK_SECRET).update(payload).digest("base64url")
    if (signature !== expectedSignature) return null

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as { email?: string }
    if (!data.email || typeof data.email !== "string") return null

    return data.email.trim().toLowerCase()
  } catch {
    return null
  }
}

export async function processUnsubscribeEmail(email: string): Promise<{ success: boolean; usersUpdated: number; ordersUpdated: number }> {
  const normalized = email.trim().toLowerCase()

  const [userResult, orderResult] = await Promise.all([
    prisma.user.updateMany({
      where: { email: { equals: normalized, mode: "insensitive" } },
      data: {
        marketingConsentAt: null,
      },
    }),
    prisma.order.updateMany({
      where: { customerEmail: { equals: normalized, mode: "insensitive" } },
      data: {
        marketingConsentAt: null,
      },
    }),
  ])

  return {
    success: true,
    usersUpdated: userResult.count,
    ordersUpdated: orderResult.count,
  }
}
