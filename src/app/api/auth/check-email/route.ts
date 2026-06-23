import { NextRequest, NextResponse } from "next/server"
import { emailExists } from "@/server/services/user.service"

// Mapa en memoria para rate limiting por IP (se resetea al reiniciar el servidor)
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 10

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
  const now = Date.now()
  const record = attempts.get(ip)

  if (record && now < record.resetAt) {
    if (record.count >= MAX_REQUESTS) {
      return NextResponse.json({ exists: false }, { status: 429 })
    }
    record.count++
  } else {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  }

  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ exists: false })
  }

  const exists = await emailExists(email)
  return NextResponse.json({ exists })
}
