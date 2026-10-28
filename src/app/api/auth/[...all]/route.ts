import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getAdminByEmailForAuth } from "@/server/services/admin.service"
import { consumePublicRateLimit } from "@/server/services/public-rate-limit.service"
import { resetAdminLoginAttempts } from "@/server/services/admin-login-rate-limit.service"
import { toNextJsHandler } from "better-auth/next-js"

const handler = toNextJsHandler(auth)

async function adminEmailFrom(request: Request): Promise<string | null> {
  if (!new URL(request.url).pathname.endsWith("/sign-in/email")) return null

  try {
    const body: unknown = await request.clone().json()
    const email = typeof body === "object" && body !== null ? (body as { email?: unknown }).email : undefined
    if (typeof email !== "string" || email.length > 254) return null

    return (await getAdminByEmailForAuth(email)) ? email : null
  } catch {
    return null
  }
}

export const GET = handler.GET

/**
 * Better Auth is public: enforce the same admin credential limit here, not
 * only in the preparatory admin UI action, so direct API requests cannot skip it.
 */
export async function POST(request: Request): Promise<Response> {
  const adminEmail = await adminEmailFrom(request)
  if (adminEmail) {
    const limit = await consumePublicRateLimit("admin-sign-in", request.headers, {
      max: 5,
      windowMs: 15 * 60 * 1_000,
      subject: adminEmail,
    })
    if (!limit.allowed) {
      return NextResponse.json(
        { message: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      )
    }
  }

  const response = await handler.POST(request)
  if (adminEmail && response.ok) {
    // Keep the preparatory UI limiter aligned after a direct successful login.
    const trustedIp = request.headers.get("x-real-ip")?.trim() ?? "unknown"
    resetAdminLoginAttempts(trustedIp, adminEmail)
  }
  return response
}
