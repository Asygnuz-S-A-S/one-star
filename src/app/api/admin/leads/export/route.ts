import { requireAdmin } from "@/server/auth/require-admin"
import { exportLeadsToCsv } from "@/server/services/lead.service"

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return new Response("No autorizado", { status: 401 })
  }

  try {
    const csvContent = await exportLeadsToCsv()
    const filename = `leads_onestar_${new Date().toISOString().slice(0, 10)}.csv`

    // Se incluye BOM (\uFEFF) para que Excel abra UTF-8 con tildes y caracteres especiales correctamente
    return new Response(`\uFEFF${csvContent}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[export-leads] Error al generar CSV:", error)
    return new Response("Error al exportar leads", { status: 500 })
  }
}
