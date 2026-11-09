import { buildGoogleFeedXml } from "@/lib/seo/google-feed"
import { getSiteUrl } from "@/lib/site-url"
import { getGoogleFeedProducts } from "@/server/services/product.service"
import { getStoreSettings } from "@/server/services/store-settings.service"

export const dynamic = "force-dynamic"

/** Feed para Google Merchant Center: se registra la URL /feed/google.xml como fuente programada. */
export async function GET() {
  try {
    const [products, settings] = await Promise.all([getGoogleFeedProducts(), getStoreSettings()])
    return new Response(buildGoogleFeedXml(products, getSiteUrl(), settings.storeName), {
      headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600" },
    })
  } catch (error) {
    console.error("[feed/google] no se pudo generar el feed:", error)
    return new Response("Feed no disponible", { status: 500 })
  }
}
