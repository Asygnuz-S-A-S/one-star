import { timingSafeEqual } from "node:crypto"
import { getSiteUrl } from "@/lib/site-url"
import { getMetaCatalogFeed } from "@/server/services/meta-catalog.service"
import { metaCatalogQuerySchema } from "@/server/validators/meta-catalog.validator"

/**
 * Feed de catálogo para Meta.
 *
 * Se pega en Commerce Manager → Catálogo → Fuentes de datos → Feed programado:
 *   https://tiendaonestar.com/api/meta/catalogo?token=<META_CATALOG_TOKEN>
 *
 * **Falla cerrado**: sin `META_CATALOG_TOKEN` configurada el feed responde 404,
 * igual que con un token equivocado. El feed expone el catálogo completo con
 * existencias (`quantity_to_sell_on_facebook`), que es información de negocio:
 * no debe quedar accesible por olvidar una variable de entorno.
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

  // Mismo 404 para "no configurado" y "token equivocado": no revelamos si el
  // feed existe ni si el token iba por buen camino.
  const expectedToken = process.env.META_CATALOG_TOKEN?.trim()
  if (!expectedToken) {
    console.warn("[api/meta/catalogo] META_CATALOG_TOKEN sin configurar: feed deshabilitado")
    return new Response(null, { status: 404 })
  }

  const received = parsed.data.token ?? ""
  if (received.length === 0 || !tokenMatches(expectedToken, received)) {
    return new Response(null, { status: 404 })
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
