import { getAllBanners } from "@/server/services/banner.service"
import BannersClient from "./BannersClient"

export default async function BannersPage() {
  const banners = await getAllBanners()

  return (
    <div className="p-6 md:p-8">
      <BannersClient banners={banners} />
    </div>
  )
}
