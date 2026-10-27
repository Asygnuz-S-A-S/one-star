import { requireAdmin } from "@/server/auth/require-admin"
import { getNewsletterSubscribers } from "@/server/services/user.service"

// Una celda por campo; las comillas se escapan y se neutralizan fórmulas al abrir en Excel.
function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

/** Exporta solo a quienes aceptaron el newsletter, para cargarlos en la herramienta de correo. */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return new Response("No autorizado", { status: 401 })
  }

  const subscribers = await getNewsletterSubscribers()
  const lines = [
    ["email", "nombre", "miembro_club", "consentimiento"].join(","),
    ...subscribers.map((s) => [csvCell(s.email), csvCell(s.name), s.clubMember ? "si" : "no", s.consentAt].join(",")),
  ]
  const date = new Date().toISOString().slice(0, 10)
  return new Response(`﻿${lines.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-one-star-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
