"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { motion } from "motion/react"

const ClientStoreMap = dynamic(() => import("@/components/tiendas/ClientStoreMap"), { ssr: false })

interface StoreInfo {
  id: string
  name: string
  address: string
  city: string
  phone: string | null
  schedule: string | null
  googleMapsUrl: string | null
  latitude: number | null
  longitude: number | null
  stock: number
}

interface StoreAvailabilityProps {
  availableOnline: boolean
  availableInStores: boolean
  stores: StoreInfo[]
  webStock: number
}

export default function StoreAvailability({
  availableOnline,
  availableInStores,
  stores,
  webStock,
}: StoreAvailabilityProps) {
  const physicalStores = stores.filter((s) => s.stock > 0)

  return (
    <section className="py-12 border-t border-[#E0E0E0] dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-[var(--font-barlow)] font-bold text-2xl uppercase tracking-wider text-[#1C1C1C] dark:text-white mb-8">
          Disponibilidad
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {/* Online */}
          <div className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-colors ${
            availableOnline && webStock > 0
              ? "border-green-500/30 bg-green-50 dark:bg-green-500/5"
              : "border-[#E0E0E0] dark:border-white/10 opacity-60"
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              availableOnline && webStock > 0 ? "bg-green-500" : "bg-gray-300 dark:bg-white/10"
            }`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div>
              <p className="font-[var(--font-barlow)] font-bold text-sm uppercase tracking-wider text-[#1C1C1C] dark:text-white mb-1">
                Compra en línea
              </p>
              {availableOnline && webStock > 0 ? (
                <p className="font-[var(--font-montserrat)] text-xs text-green-600 dark:text-green-400 font-semibold">
                  ● Disponible — Envío a todo Colombia
                </p>
              ) : (
                <p className="font-[var(--font-montserrat)] text-xs text-[#4A4A4A] dark:text-gray-400">
                  No disponible en línea
                </p>
              )}
            </div>
          </div>

          {/* In-store */}
          <div className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-colors ${
            availableInStores && physicalStores.length > 0
              ? "border-blue-500/30 bg-blue-50 dark:bg-blue-500/5"
              : "border-[#E0E0E0] dark:border-white/10 opacity-60"
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              availableInStores && physicalStores.length > 0 ? "bg-blue-500" : "bg-gray-300 dark:bg-white/10"
            }`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <p className="font-[var(--font-barlow)] font-bold text-sm uppercase tracking-wider text-[#1C1C1C] dark:text-white mb-1">
                Tiendas físicas
              </p>
              {availableInStores && physicalStores.length > 0 ? (
                <>
                  <p className="font-[var(--font-montserrat)] text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    ● Disponible en {physicalStores.length} tienda{physicalStores.length !== 1 ? "s" : ""}
                  </p>
                  <p className="font-[var(--font-montserrat)] text-xs text-[#4A4A4A] dark:text-gray-400 mt-1">
                    Compra presencial. La web no aparta ni reserva unidades de tienda.
                  </p>
                </>
              ) : (
                <p className="font-[var(--font-montserrat)] text-xs text-[#4A4A4A] dark:text-gray-400">
                  No disponible en tiendas físicas
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Physical stores list with maps */}
        {physicalStores.length > 0 && (
          <div className="flex flex-col gap-6">
            {physicalStores.map((store, i) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-[#F5F5F5] dark:bg-white/5 dark:border dark:border-white/10 rounded-2xl overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {/* Store info */}
                  <div className="p-6 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-[var(--font-barlow)] font-bold text-base uppercase tracking-wide text-[#1C1C1C] dark:text-white">
                          {store.name}
                        </h3>
                        <p className="font-[var(--font-montserrat)] text-xs text-[#4A4A4A] dark:text-gray-400 mt-0.5">
                          {store.city}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full uppercase tracking-wider"
                        title="Existencias en tienda según el ERP. Sin reserva por la web."
                      >
                        {store.stock} en tienda
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex items-start gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#4A4A4A] dark:text-gray-400 mt-0.5 shrink-0">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span className="font-[var(--font-montserrat)] text-[#4A4A4A] dark:text-gray-300 text-xs leading-relaxed">
                          {store.address}
                        </span>
                      </div>
                      {store.phone && (
                        <div className="flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#4A4A4A] dark:text-gray-400 shrink-0">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.86 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z"/>
                          </svg>
                          <a href={`tel:${store.phone}`} className="font-[var(--font-montserrat)] text-xs text-[#4A4A4A] dark:text-gray-300 hover:text-[#1C1C1C] dark:hover:text-white transition-colors">
                            {store.phone}
                          </a>
                        </div>
                      )}
                      {store.schedule && (
                        <div className="flex items-start gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#4A4A4A] dark:text-gray-400 mt-0.5 shrink-0">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          <span className="font-[var(--font-montserrat)] text-xs text-[#4A4A4A] dark:text-gray-300 leading-relaxed">
                            {store.schedule}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex gap-2 mt-auto pt-3">
                      {store.googleMapsUrl && (
                        <Link
                          href={store.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border border-[#1C1C1C] dark:border-white text-[#1C1C1C] dark:text-white px-3 py-2 hover:bg-[#1C1C1C] hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          Ver en Maps
                        </Link>
                      )}
                      {store.latitude && store.longitude && (
                        <Link
                          href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-[#1C1C1C] dark:bg-white text-white dark:text-black px-3 py-2 hover:bg-[#E31C23] dark:hover:bg-gray-200 transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                          </svg>
                          Cómo llegar
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Map */}
                  <div className="min-h-[200px] md:min-h-0 relative">
                    {store.latitude && store.longitude ? (
                      <ClientStoreMap
                        position={{ lat: store.latitude, lng: store.longitude }}
                        name={store.name}
                        address={store.address}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#E0E0E0] dark:bg-white/5 flex items-center justify-center text-[#4A4A4A] dark:text-gray-500 text-xs font-[var(--font-montserrat)]">
                        Mapa no disponible
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
