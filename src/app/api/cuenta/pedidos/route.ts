import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserOrders } from "@/server/services/order.service"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })

  const userType = session ? (session.user as { userType?: string }).userType : undefined
  if (!session?.user?.id || userType !== "customer") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }

  const orders = await getUserOrders(session.user.id)
  return NextResponse.json({ orders })
}
