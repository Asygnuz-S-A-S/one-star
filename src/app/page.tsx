import LandingSections from "@/components/landing/LandingSections"
import { getActiveLandingSections } from "@/server/services/landing-section.service"

export const dynamic = "force-dynamic";

export default async function Home() {
  const sections = await getActiveLandingSections().catch((error: unknown) => {
    console.error("[home] getActiveLandingSections falló:", error)
    return []
  })

  return <LandingSections sections={sections} />
}
