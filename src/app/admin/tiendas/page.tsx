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
        <h1 className="text-3xl font-bold font-barlow text-[#1C1C1C]">
          Tiendas
        </h1>
        <p className="text-gray-500 mt-2 font-montserrat">
          Dirección, horario y mapa de cada sede. Lo que guardas aquí es lo que ve el cliente
          en la página de tiendas y en la disponibilidad del producto.
        </p>
      </div>

      <StoreManager initialStores={stores} erpLocations={erpLocations} />
    </div>
  )
}
