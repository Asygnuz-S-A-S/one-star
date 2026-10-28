import { NextResponse } from "next/server"
import { exportLeadsToCsv } from "@/server/services/lead.service"

export async function GET() {
  try {
    const csvContent = await exportLeadsToCsv()
    const filename = `leads_onestar_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[export-leads] Error al generar CSV:", error)
    return new NextResponse("Error al exportar leads", { status: 500 })
  }
}
