import { timingSafeEqual } from "node:crypto"
import { getSiteUrl } from "@/lib/site-url"
import { getMetaCatalogFeed } from "@/server/services/meta-catalog.service"
import { metaCatalogQuerySchema } from "@/server/validators/meta-catalog.validator"

/**
 * Feed de catálogo para Meta.
 *
 * Se pega en Commerce Manager → Catálogo → Fuentes de datos → Feed programado:
 *   https://tiendaonestar.com/api/meta/catalogo
 *
 * Si `META_CATALOG_TOKEN` está definida, la URL debe llevar `?token=...` y sin
 * él responde 401. Sin esa variable el feed es público (son datos que ya se ven
 * en la tienda: nombre, precio, foto y enlace).
 */
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function tokenMatches(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(received, "utf8")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const parsed = metaCatalogQuerySchema.safeParse({
    token: searchParams.get("token") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  })
  if (!parsed.success) {
    return new Response("Parámetros inválidos", { status: 400 })
  }

  const expectedToken = process.env.META_CATALOG_TOKEN?.trim()
  if (expectedToken) {
    const received = parsed.data.token ?? ""
    if (received.length === 0 || !tokenMatches(expectedToken, received)) {
      return new Response("No autorizado", { status: 401 })
    }
  }

  const feed = await getMetaCatalogFeed(getSiteUrl(), parsed.data.limit)

  return new Response(feed.xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Meta descarga el feed cada varias horas: una hora de caché en el borde
      // evita golpear la base en cada descarga sin dejar el catálogo viejo.
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "X-Meta-Catalog-Items": String(feed.itemCount),
    },
  })
}
