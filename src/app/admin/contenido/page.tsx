import { requireSuperAdmin } from "@/server/auth/require-admin"
import { getSiteContentForAdmin } from "@/server/services/site-content.service"
import SiteContentManager from "@/components/admin/SiteContentManager"

export const metadata = { title: "Contenido y Promesas | Admin One Star" }
export const dynamic = "force-dynamic"

export default async function AdminContenidoPage() {
  await requireSuperAdmin()
  const content = await getSiteContentForAdmin()

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C] mb-1">
        Contenido y Promesas Globales
      </h1>
      <p className="text-sm text-[#4A4A4A] mb-8 font-montserrat">
        Configura los beneficios generales, preguntas frecuentes de la tienda y promesas de compra.
        Estos contenidos aplican a todos los productos como base, a menos que una marca o producto específico los sobreescriba.
      </p>

      <SiteContentManager initialContent={content} />
    </div>
  )
}
