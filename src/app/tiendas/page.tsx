import React from "react"
import { prisma } from "@/server/db/prisma"
import DynamicStoreMap from "@/components/tiendas/DynamicStoreMap"
import StoreActionButtons from "@/components/tiendas/StoreActionButtons"
import { getStoreMapQuery, resolveStoreCoordinates } from "@/lib/store-location"

export const metadata = {
  title: "Nuestras Tiendas | One Star",
  description: "Encuentra la sucursal One Star más cercana a ti.",
}

// Las tiendas se gestionan desde el admin: la página se renderiza por request
// (además evita requerir una BD accesible durante el build/prerender).
export const dynamic = "force-dynamic"

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
    <div className="store-section store-gutter mx-auto max-w-6xl">
      <header className="mb-10 max-w-2xl">
        <p className="store-eyebrow mb-3">Visítanos</p>
        <h1 className="font-barlow text-4xl font-extrabold uppercase leading-none tracking-[-0.03em] text-[#1C1C1C] sm:text-5xl">
          Nuestras tiendas
        </h1>
        <span aria-hidden="true" className="mt-3 block h-1 w-12 bg-[#E31C23]" />
        <p className="mt-4 font-montserrat text-base text-[#4A4A4A]">
          Visítanos en nuestras sucursales físicas y descubre todas nuestras colecciones en persona.
          Encuentra tu tienda One Star más cercana.
        </p>
      </header>

      {Object.keys(storesByCity).length === 0 ? (
        <div className="rounded-[var(--store-radius-lg)] border border-[#ECECEA] bg-white p-12 text-center">
          <h2 className="mb-2 font-barlow text-2xl font-bold">Próximamente</h2>
          <p className="font-montserrat text-[#4A4A4A]">
            Estamos preparando la información de nuestras tiendas. Vuelve pronto.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(storesByCity).map(([city, cityStores]) => (
            <section key={city} aria-labelledby={`ciudad-${city}`}>
              <h2 id={`ciudad-${city}`} className="mb-5 flex items-baseline gap-3 font-barlow text-2xl font-bold uppercase tracking-[-0.01em] text-[#1C1C1C]">
                {city}
                <span className="font-montserrat text-sm font-normal normal-case text-[#4A4A4A]">
                  {cityStores.length} {cityStores.length === 1 ? "tienda" : "tiendas"}
                </span>
              </h2>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {cityStores.map((store) => {
                  const coords = resolveStoreCoordinates(store)
                  // Una sola tienda en la ciudad: tarjeta ancha con el mapa al lado, sin dejar la página vacía.
                  const wide = cityStores.length === 1
                  return (
                    <article
                      key={store.id}
                      className={`overflow-hidden rounded-[var(--store-radius-lg)] border border-[#ECECEA] bg-white transition-shadow hover:shadow-[var(--store-elevation-raised)] ${
                        wide ? "md:col-span-2 xl:col-span-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]" : "flex flex-col"
                      }`}
                    >
                      <div className={`relative z-0 h-56 w-full ${wide ? "sm:h-72 lg:order-2 lg:h-full lg:min-h-[340px]" : ""}`}>
                        <DynamicStoreMap
                          position={coords}
                          query={getStoreMapQuery(store)}
                          name={store.name}
                          address={store.address}
                        />
                      </div>

                      <div className="flex flex-1 flex-col justify-between gap-6 p-6 lg:p-8">
                        <div>
                          <p className="store-eyebrow mb-2">{store.city}</p>
                          <h3 className="font-barlow text-2xl font-bold uppercase leading-tight text-[#1C1C1C]">
                            {store.name}
                          </h3>
                          {store.photos && store.photos.length > 0 && (
                            <div className={`mt-5 grid gap-2 ${
                              store.photos.length === 1 ? "grid-cols-1" : store.photos.length === 2 ? "grid-cols-2" : "grid-cols-3"
                            }`}>
                              {store.photos.slice(0, 3).map((photoUrl, idx) => (
                                <div
                                  key={photoUrl}
                                  className="relative aspect-[4/3] overflow-hidden rounded-[var(--store-radius)] bg-[#F5F5F5]"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={photoUrl}
                                    alt={`${store.name}, foto ${idx + 1}`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <dl className="mt-5 space-y-3 font-montserrat text-sm text-[#4A4A4A]">
                            <div className="flex gap-3">
                              <dt className="sr-only">Dirección</dt>
                              <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#1C1C1C]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657 13.414 20.9a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" /></svg>
                              <dd>{store.address}</dd>
                            </div>
                            {store.schedule && (
                              <div className="flex gap-3">
                                <dt className="sr-only">Horario</dt>
                                <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#1C1C1C]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 2" /></svg>
                                <dd>{store.schedule}</dd>
                              </div>
                            )}
                            {store.phone && (
                              <div className="flex gap-3">
                                <dt className="sr-only">Teléfono</dt>
                                <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#1C1C1C]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
                                <dd><a href={`tel:${store.phone.replace(/\s/g, "")}`} className="underline-offset-4 hover:text-[#1C1C1C] hover:underline">{store.phone}</a></dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        <StoreActionButtons
                          name={store.name}
                          address={store.address}
                          city={store.city}
                          latitude={coords?.lat}
                          longitude={coords?.lng}
                        />
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
