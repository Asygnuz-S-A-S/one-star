import { NextRequest, NextResponse } from "next/server"
import { emailExists } from "@/server/services/user.service"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ exists: false })
  }

  const exists = await emailExists(email)
  return NextResponse.json({ exists })
}
