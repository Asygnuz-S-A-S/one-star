import React from "react"
import { prisma } from "@/server/db/prisma"
import StoreManager from "@/components/admin/StoreManager"

export const metadata = {
  title: "Sucursales | Admin One Star",
}

export default async function StoresAdminPage() {
  const stores = await prisma.storeLocation.findMany({
    orderBy: { createdAt: "asc" }
  })

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-[var(--font-barlow)] text-[#1C1C1C]">
          Gestor de Sucursales Físicas
        </h1>
        <p className="text-gray-500 mt-2 font-[var(--font-montserrat)]">
          Añade o edita las tiendas de la marca. Esta información aparecerá automáticamente
          en la página pública de <code>/tiendas</code>.
        </p>
      </div>

      <StoreManager initialStores={stores} />
    </div>
  )
}
