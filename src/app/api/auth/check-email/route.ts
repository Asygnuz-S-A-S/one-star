import { NextRequest, NextResponse } from "next/server"
import { consumePublicRateLimit } from "@/server/services/public-rate-limit.service"

/**
 * Registration remains authoritative in registerCustomer. This endpoint no
 * longer reveals whether an address owns an account to anonymous callers.
 */
export async function GET(request: NextRequest) {
  const limit = await consumePublicRateLimit("check-email", request.headers, {
    max: 10,
    windowMs: 60_000,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { exists: false },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    )
  }

  return NextResponse.json({ exists: false })
}
