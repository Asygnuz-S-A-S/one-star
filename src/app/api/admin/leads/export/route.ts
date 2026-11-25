import { requireAdmin } from "@/server/auth/require-admin"
import { exportLeadsToCsv, type ExportLeadsFilters } from "@/server/services/lead.service"

const ALLOWED_SOURCES = new Set<NonNullable<ExportLeadsFilters["source"]>>([
  "ALL",
  "WHATSAPP",
  "CLUB",
  "ABANDONED_CART",
  "REGISTERED_NO_ORDER",
])

function slugifyFilenamePart(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
}

export async function GET(request?: Request) {
  try {
    await requireAdmin("sales")
  } catch {
    return new Response("No autorizado", { status: 401 })
  }

  try {
    const searchParams = request ? new URL(request.url).searchParams : new URLSearchParams()
    const rawSource = searchParams.get("source")?.trim() ?? "ALL"
    const source = ALLOWED_SOURCES.has(rawSource as NonNullable<ExportLeadsFilters["source"]>)
      ? (rawSource as ExportLeadsFilters["source"])
      : "ALL"

    const filters: ExportLeadsFilters = {
      q: searchParams.get("q")?.trim() || undefined,
      source,
      stage: searchParams.get("stage")?.trim() || undefined,
      utm: searchParams.get("utm")?.trim() || undefined,
      tag: searchParams.get("tag")?.trim() || undefined,
      hasPhone: searchParams.get("hasPhone") === "true",
      needsHumanOnly: searchParams.get("needsHuman") === "true",
    }

    const csvContent = await exportLeadsToCsv(filters)
    const today = new Date().toISOString().slice(0, 10)
    const tagSlug =
      filters.tag && filters.tag !== "ALL" ? slugifyFilenamePart(filters.tag) : ""
    const hasFilter = Boolean(
      filters.q ||
        (filters.source && filters.source !== "ALL") ||
        (filters.stage && filters.stage !== "ALL") ||
        filters.utm ||
        tagSlug ||
        filters.hasPhone ||
        filters.needsHumanOnly
    )
    const suffix = tagSlug ? `_${tagSlug}` : hasFilter ? "_filtrados" : ""
    const filename = `leads_onestar${suffix}_${today}.csv`

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
