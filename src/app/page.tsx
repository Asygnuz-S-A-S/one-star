import type { Metadata } from "next";
import LandingSections from "@/components/landing/LandingSections"
import { getLandingSectionsForRequest } from "@/server/services/landing-section.service"

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: "One Star | Urban Performance", description: "Tienda de calzado urbano y deportivo premium en Colombia." },
};

export default async function Home({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams
  const sections = await getLandingSectionsForRequest("home", preview === "true").catch((error: unknown) => {
    console.error("[home] getLandingSectionsForRequest falló:", error)
    return []
  })

  return <LandingSections sections={sections} />
}
