import { NextResponse } from "next/server"
import { syncCatalogFromERP } from "@/server/services/erp-sync.service"

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

    // Validar seguridad (Solo si está configurada en .env)
    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Ejecutar sincronización
    const result = await syncCatalogFromERP()

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      processed: result.processedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno ejecutando sincronización automática" },
      { status: 500 }
    )
  }
}
