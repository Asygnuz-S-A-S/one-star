import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserOrders } from "@/server/services/order.service"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id || session.user.userType !== "customer") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }

  const orders = await getUserOrders(session.user.id)
  return NextResponse.json({ orders })
}
