import type { Metadata } from "next";
import LandingSections from "@/components/landing/LandingSections"
import { buildSiteJsonLd, serializeJsonLd } from "@/lib/seo/product-seo"
import { getSiteUrl } from "@/lib/site-url"
import { getLandingSectionsForRequest } from "@/server/services/landing-section.service"
import { getStoreSettings } from "@/server/services/store-settings.service"

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: "One Star | Urban Performance", description: "Tienda de calzado urbano y deportivo premium en Colombia." },
};

export default async function Home({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams
  const [sections, settings] = await Promise.all([
    getLandingSectionsForRequest("home", preview === "true").catch((error: unknown) => {
      console.error("[home] getLandingSectionsForRequest falló:", error)
      return []
    }),
    getStoreSettings().catch(() => null),
  ])
  const siteJsonLd = buildSiteJsonLd({
    siteUrl: getSiteUrl(),
    storeName: settings?.storeName ?? "One Star",
    contactEmail: settings?.contactEmail,
    contactPhone: settings?.contactPhone,
  })

  return (
    <>
      {/* Bloque de datos (no se ejecuta): igual que el JSON-LD de la ficha de producto. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(siteJsonLd) }} />
      <LandingSections sections={sections} />
    </>
  )
}
