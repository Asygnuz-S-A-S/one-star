import LandingSections from "@/components/landing/LandingSections"
import { getLandingSectionsForRequest } from "@/server/services/landing-section.service"

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams
  const sections = await getLandingSectionsForRequest("home", preview === "true").catch((error: unknown) => {
    console.error("[home] getLandingSectionsForRequest falló:", error)
    return []
  })

  return <LandingSections sections={sections} />
}
