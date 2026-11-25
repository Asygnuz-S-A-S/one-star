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
  const rawCheckoutVariant = url.searchParams.get("checkout")?.trim() ?? ""
  const checkoutVariant = /^[a-zA-Z0-9_-]{4,64}$/.test(rawCheckoutVariant) ? rawCheckoutVariant : null
  const rawQty = parseInt(url.searchParams.get("qty") ?? "1", 10)
  const checkoutQty = Number.isFinite(rawQty) ? Math.min(5, Math.max(1, rawQty)) : 1
  const baseUrl = getBaseUrl(request)

  try {
    const result = await resolveShortLinkClick(code ?? "", {
      utmCampaign,
      fallbackProductSlug,
      baseUrl,
    })

    let targetUrl = result.redirectUrl
    if (checkoutVariant) {
      const parsedRedirect = new URL(result.redirectUrl)
      const checkoutDest = new URL(`${baseUrl.replace(/\/+$/, "")}/checkout`)
      checkoutDest.searchParams.set("variant", checkoutVariant)
      checkoutDest.searchParams.set("qty", String(checkoutQty))
      for (const [k, v] of parsedRedirect.searchParams.entries()) {
        if (k.startsWith("utm_")) checkoutDest.searchParams.set(k, v)
      }
      targetUrl = checkoutDest.toString()
    }

    const response = NextResponse.redirect(targetUrl, { status: 302 })

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
