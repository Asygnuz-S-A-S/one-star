import { getAllGridBlocks } from "@/server/services/home-grid.service"
import HomeGridClient from "./HomeGridClient"

export default async function HomeGridPage() {
  const blocks = await getAllGridBlocks()

  return (
    <div className="p-6 md:p-8">
      <HomeGridClient blocks={blocks} />
    </div>
  )
}
