import { NextResponse } from "next/server"
import { markAbandonedLeads } from "@/server/services/lead.service"
import { expireAbandonedOrders, releaseStockReservations } from "@/server/services/order.service"
import { cleanupOldWebEvents } from "@/server/services/web-analytics.service"

/**
 * GET /api/cron/expire-orders
 * Vence los pedidos que quedaron PENDING sin ninguna notificación de la
 * pasarela (el cliente abrió ePayco pero nunca pagó), marca como ABANDONO
 * los leads de WhatsApp que llevan 24 h sin pago y limpia eventos web
 * antiguos según retención. Mismo esquema de protección que
 * /api/cron/sync-erp: `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const secret = process.env.CRON_SECRET

    // Fail-closed: en producción el endpoint NO opera sin CRON_SECRET.
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        console.error("[cron/expire-orders] CRON_SECRET no configurada — endpoint deshabilitado")
        return NextResponse.json({ error: "Cron no configurado" }, { status: 503 })
      }
    } else if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const releasedReservations = await releaseStockReservations()
    const expired = await expireAbandonedOrders()

    let abandonedLeads: string[] = []
    try {
      abandonedLeads = await markAbandonedLeads()
    } catch (leadError) {
      console.error("[cron/expire-orders] Error marcando leads en ABANDONO:", leadError)
    }

    let deletedWebEvents = 0
    try {
      deletedWebEvents = await cleanupOldWebEvents()
    } catch (analyticsError) {
      console.error("[cron/expire-orders] Error limpiando eventos web antiguos:", analyticsError)
    }

    return NextResponse.json({
      success: true,
      expired: expired.length,
      releasedReservations: releasedReservations.length,
      abandonedLeads: abandonedLeads.length,
      deletedWebEvents,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[cron/expire-orders] Error venciendo pedidos abandonados:", error)
    return NextResponse.json(
      { error: "Error interno venciendo pedidos abandonados" },
      { status: 500 }
    )
  }
}
