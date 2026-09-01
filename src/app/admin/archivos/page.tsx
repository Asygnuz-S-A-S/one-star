import { getMediaAssets } from "@/server/services/media-asset.service"
import MediaFileManager from "@/components/admin/MediaFileManager"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Gestión de Archivos y Medios | One Star Admin",
}

export default async function ArchivosAdminPage() {
  const { items } = await getMediaAssets({ limit: 150 }).catch(() => ({ items: [] }))

  return (
    <div className="max-w-7xl mx-auto py-4">
      <MediaFileManager initialAssets={items} />
    </div>
  )
}
