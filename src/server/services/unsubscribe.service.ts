import "server-only"

import { createHmac } from "node:crypto"
import { prisma } from "@/server/db/prisma"

import { unsubscribeMarketingContact } from "@/server/services/marketing.service"

/** Sin secreto no se firma nada: una clave fija en el repo permitiría falsificar enlaces de baja. */
function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET no está configurado.")
  return secret
}

export function createUnsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase()
  const payload = Buffer.from(JSON.stringify({ email: normalized, t: Date.now() })).toString("base64url")
  const signature = createHmac("sha256", getSecret()).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const [payload, signature] = token.split(".")
    if (!payload || !signature) return null

    const expectedSignature = createHmac("sha256", getSecret()).update(payload).digest("base64url")
    if (signature !== expectedSignature) return null

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as { email?: string }
    if (!data.email || typeof data.email !== "string") return null

    return data.email.trim().toLowerCase()
  } catch {
    return null
  }
}

/**
 * Retira el consentimiento de publicidad en cuentas y compras con ese correo y
 * lo da de baja en Resend. `fromResend` = la baja vino de Resend (webhook): no
 * se le avisa de vuelta, porque eso dispararía otro webhook.
 */
export async function processUnsubscribeEmail(
  email: string,
  options: { fromResend?: boolean } = {}
): Promise<{ success: boolean; usersUpdated: number; ordersUpdated: number }> {
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

  if (!options.fromResend) {
    unsubscribeMarketingContact(normalized).catch((error: unknown) => {
      console.error("[unsubscribe] No se pudo dar de baja en Resend:", error)
    })
  }

  return {
    success: true,
    usersUpdated: userResult.count,
    ordersUpdated: orderResult.count,
  }
}
