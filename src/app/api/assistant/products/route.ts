import { NextResponse } from "next/server"
import { authenticateAssistantRequest } from "@/server/services/assistant-auth.service"
import { assistantProductsQuerySchema } from "@/server/validators/assistant.validator"
import { searchAssistantProducts } from "@/server/services/assistant.service"

export const dynamic = "force-dynamic"

function getBaseUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
  const proto = req.headers.get("x-forwarded-proto") || "https"
  return host ? `${proto}://${host}` : "https://onestar.com.co"
}

export async function GET(request: Request) {
  const auth = await authenticateAssistantRequest(request)
  if (!auth.authorized) {
    return auth.response
  }

  const { searchParams } = new URL(request.url)
  const rawParams = {
    q: searchParams.get("q") ?? undefined,
    brand: searchParams.get("brand") ?? undefined,
    gender: searchParams.get("gender") ?? undefined,
    size: searchParams.get("size") ?? undefined,
    maxPrice: searchParams.get("maxPrice") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  }

  const parsed = assistantProductsQuerySchema.safeParse(rawParams)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const baseUrl = getBaseUrl(request)
  const result = await searchAssistantProducts(parsed.data, baseUrl)

  return NextResponse.json(result)
}
