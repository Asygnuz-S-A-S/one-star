import { NextResponse } from "next/server"
import { runDueErpSync } from "@/server/services/erp-sync-scheduler.service"

/**
 * Endpoint para Sincronización Automática (Cron Job).
 * Puedes configurar un servicio como Vercel Cron, AWS EventBridge, 
 * o un cron tab estándar para llamar a esta ruta GET.
 * 
 * Es importante proteger esta ruta con un CRON_SECRET en el .env 
 * para que nadie pueda llamarla libremente.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const secret = process.env.CRON_SECRET

    // Fail-closed: en producción el endpoint NO opera sin CRON_SECRET
    // configurada. En desarrollo se permite sin secreto para pruebas locales.
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        console.error("[cron/sync-erp] CRON_SECRET no configurada — endpoint deshabilitado")
        return NextResponse.json({ error: "Cron no configurado" }, { status: 503 })
      }
    } else if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const scheduled = await runDueErpSync()

    if (!scheduled.executed) {
      return NextResponse.json({
        success: true,
        executed: false,
        reason: scheduled.reason,
        timestamp: new Date().toISOString(),
      })
    }

    const result = scheduled.result

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      executed: true,
      processed: result.processedCount,
      timestamp: new Date().toISOString()
    })
  } catch {
    return NextResponse.json(
      { error: "Error interno ejecutando sincronización automática" },
      { status: 500 }
    )
  }
}
