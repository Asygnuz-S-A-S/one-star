import { getAllBrandsWithDetails } from "@/server/services/brand.service"
import BrandManager from "@/components/admin/BrandManager"

export default async function MarcasPage() {
  const brands = await getAllBrandsWithDetails()

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C] mb-6">
        Catálogo de Marcas
      </h1>
      <p className="text-gray-500 -mt-4 mb-3 font-montserrat text-sm">
        Historia, beneficios y preguntas de cada marca. Eso es lo que ve el cliente en la ficha.
      </p>
      <details className="mb-6 text-sm text-gray-500 font-montserrat">
        <summary className="cursor-pointer font-semibold text-[#1C1C1C]">Cómo se conecta con Loggro</summary>
        <p className="mt-2">
          En Loggro la marca llega como «Categoría». La columna ID ERP es el código con el que
          se reconoce al sincronizar.
        </p>
      </details>
      <BrandManager brands={brands} />
    </div>
  )
}
