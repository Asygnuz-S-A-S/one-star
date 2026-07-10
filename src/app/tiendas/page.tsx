import React from "react"
import { prisma } from "@/server/db/prisma"
import DynamicStoreMap from "@/components/tiendas/DynamicStoreMap"
import StoreActionButtons from "@/components/tiendas/StoreActionButtons"

export const metadata = {
  title: "Nuestras Tiendas | One Star",
  description: "Encuentra la sucursal One Star más cercana a ti.",
}

export default async function TiendasPage() {
  const stores = await prisma.storeLocation.findMany({
    where: { isActive: true },
    orderBy: [{ city: "asc" }, { name: "asc" }]
  })

  // Agrupar tiendas por ciudad
  const storesByCity = stores.reduce((acc, store) => {
    if (!acc[store.city]) acc[store.city] = []
    acc[store.city].push(store)
    return acc
  }, {} as Record<string, typeof stores>)

  return (
    <div className="min-h-screen bg-[#F5F5F5] pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-[var(--font-barlow)] font-bold text-[#1C1C1C] uppercase mb-4">
            Nuestras Tiendas
          </h1>
          <p className="text-gray-600 font-[var(--font-montserrat)] max-w-2xl mx-auto text-lg">
            Visítanos en nuestras sucursales físicas y descubre todas nuestras colecciones en persona. 
            Encuentra tu tienda One Star más cercana.
          </p>
        </div>

        {Object.keys(storesByCity).length === 0 ? (
          <div className="text-center p-12 bg-white rounded-lg shadow-sm">
            <h2 className="text-2xl font-[var(--font-barlow)] font-bold mb-2">Próximamente</h2>
            <p className="text-gray-500 font-[var(--font-montserrat)]">
              Estamos preparando la información de nuestras tiendas. Vuelve pronto.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {Object.entries(storesByCity).map(([city, cityStores]) => (
              <div key={city}>
                <h2 className="text-3xl font-[var(--font-barlow)] font-bold text-[#1C1C1C] border-b-2 border-[#1C1C1C] pb-3 mb-8">
                  {city}
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cityStores.map((store) => (
                    <div key={store.id} className="bg-white p-6 rounded-lg shadow-sm border border-[#E0E0E0] hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 bg-[#1C1C1C] text-white flex items-center justify-center rounded-full mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-[var(--font-barlow)] font-bold text-[#1C1C1C] mb-3">
                        {store.name}
                      </h3>
                      
                      <div className="space-y-2 text-sm text-gray-600 font-[var(--font-montserrat)] mb-6">
                        <p className="flex items-start gap-2">
                          <span className="font-bold text-[#1C1C1C]">Dir:</span>
                          <span>{store.address}</span>
                        </p>
                        {store.phone && (
                          <p className="flex items-start gap-2">
                            <span className="font-bold text-[#1C1C1C]">Tel:</span>
                            <span>{store.phone}</span>
                          </p>
                        )}
                        {store.schedule && (
                          <p className="flex items-start gap-2">
                            <span className="font-bold text-[#1C1C1C]">Horario:</span>
                            <span>{store.schedule}</span>
                          </p>
                        )}
                      </div>

                      {store.latitude && store.longitude && (
                        <DynamicStoreMap 
                          position={{ lat: store.latitude, lng: store.longitude }}
                          name={store.name}
                          address={store.address}
                        />
                      )}

                      <StoreActionButtons 
                        name={store.name}
                        address={store.address}
                        city={store.city}
                        latitude={store.latitude}
                        longitude={store.longitude}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
      </div>
    </div>
  )
}
