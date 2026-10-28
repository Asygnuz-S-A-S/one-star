import { NextResponse } from "next/server"
import { authenticateAssistantRequest } from "@/server/services/assistant-auth.service"
import { assistantStockQuerySchema } from "@/server/validators/assistant.validator"
import { checkAssistantStock } from "@/server/services/assistant.service"

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
    product: searchParams.get("product") ?? undefined,
    size: searchParams.get("size") ?? undefined,
  }

  const parsed = assistantStockQuerySchema.safeParse(rawParams)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const baseUrl = getBaseUrl(request)
  const result = await checkAssistantStock(parsed.data, baseUrl)

  if (!result) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    )
  }

  return NextResponse.json(result)
}
