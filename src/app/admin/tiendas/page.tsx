import React from "react"
import StoreManager from "@/components/admin/StoreManager"
import { getErpStockLocations, getStoreLocations } from "@/server/services/store.service"

export const metadata = {
  title: "Sucursales | Admin One Star",
}

// Datos en vivo (sedes del ERP): nunca pre-generar.
export const dynamic = "force-dynamic"

export default async function StoresAdminPage() {
  const [stores, erpLocations] = await Promise.all([getStoreLocations(), getErpStockLocations()])

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-[var(--font-barlow)] text-[#1C1C1C]">
          Gestor de Sucursales Físicas
        </h1>
        <p className="text-gray-500 mt-2 font-[var(--font-montserrat)]">
          Añade o edita las tiendas de la marca. Esta información aparecerá automáticamente
          en la página pública de <code>/tiendas</code> y en la disponibilidad por sede de cada
          producto. Vincula cada sucursal con su sede del ERP para que el stock por tienda se
          actualice solo con cada sincronización.
        </p>
      </div>

      <StoreManager initialStores={stores} erpLocations={erpLocations} />
    </div>
  )
}
