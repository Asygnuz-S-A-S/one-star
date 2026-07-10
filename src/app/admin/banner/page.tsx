import { getTopBanner } from "@/server/repositories/top-banner.repository"
import BannerManager from "@/components/admin/BannerManager"

export const metadata = {
  title: "Admin - Top Banner | One Star",
}

export default async function AdminBannerPage() {
  const topBanner = await getTopBanner()

  const defaultBannerData = {
    text: "Envío gratis en compras mayores a $200.000",
    btnText: "Ver SALE",
    btnUrl: "/sale",
    bgColor: "#1C1C1C",
    textColor: "#FFFFFF",
    isActive: true,
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Gestión de Banner Superior</h1>
      <p className="text-gray-600 mb-8">
        Personaliza el mensaje promocional que aparece en la parte superior de todas las páginas de la tienda.
      </p>

      <BannerManager initialData={topBanner || defaultBannerData} />
    </div>
  )
}
