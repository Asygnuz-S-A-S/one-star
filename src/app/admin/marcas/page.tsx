import { getAllBrands } from "@/server/services/brand.service"
import BrandManager from "@/components/admin/BrandManager"

export default async function MarcasPage() {
  const brands = await getAllBrands()

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C] mb-6">
        Catálogo de Marcas
      </h1>
      <p className="text-gray-500 -mt-4 mb-6 font-[var(--font-montserrat)]">
        En Loggro las marcas aparecen como «Categoría». La columna <strong>ID ERP</strong> es el
        código de categoría de Loggro con el que se asigna la marca al sincronizar.
      </p>
      <BrandManager brands={brands} />
    </div>
  )
}
