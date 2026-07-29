import { getProductColorsForAdmin } from "@/server/services/product-color.service"
import { getAdminSession } from "@/server/auth/require-admin"
import ColorManager from "@/components/admin/ColorManager"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Colores | Admin One Star",
}

export default async function ColoresPage() {
  const session = await getAdminSession()
  if (!session) {
    return <div className="p-8 text-gray-600">No autorizado.</div>
  }

  const colors = await getProductColorsForAdmin()
  return <ColorManager colors={colors} />
}
