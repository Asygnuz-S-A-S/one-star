import { NextResponse } from "next/server"
import {
  buildLeadCookieOptions,
  LEAD_COOKIE_NAME,
  signLeadCookieValue,
} from "@/lib/lead-cookie"
import { resolveShortLinkClick } from "@/server/services/lead.service"
import { consumePublicRateLimit } from "@/server/services/public-rate-limit.service"

export const dynamic = "force-dynamic"

function getBaseUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  try {
    const parsed = new URL(req.url)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return "https://onestar.com.co"
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const rateLimit = await consumePublicRateLimit("short-link-redirect", request.headers, {
    max: 60,
    windowMs: 60 * 1000,
  })

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Intenta más tarde." },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds
          ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
          : undefined,
      }
    )
  }

  const { code } = await context.params
  const url = new URL(request.url, "https://onestar.com.co")
  const utmCampaign = url.searchParams.get("utm_campaign")
  const fallbackProductSlug =
    url.searchParams.get("p") ||
    url.searchParams.get("product") ||
    url.searchParams.get("slug")
  const baseUrl = getBaseUrl(request)

  try {
    const result = await resolveShortLinkClick(code ?? "", {
      utmCampaign,
      fallbackProductSlug,
      baseUrl,
    })

    const response = NextResponse.redirect(result.redirectUrl, { status: 302 })

    if (result.found && result.leadId) {
      const signedValue = signLeadCookieValue(result.leadId)
      response.cookies.set(LEAD_COOKIE_NAME, signedValue, buildLeadCookieOptions())
    }

    return response
  } catch (error) {
    console.error("[r/[code]] Error procesando enlace corto:", error)
    const fallbackPath = fallbackProductSlug
      ? `/productos/${encodeURIComponent(fallbackProductSlug)}`
      : "/productos"
    return NextResponse.redirect(`${baseUrl.replace(/\/+$/, "")}${fallbackPath}`, {
      status: 302,
    })
  }
}
