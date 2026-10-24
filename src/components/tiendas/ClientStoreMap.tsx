"use client"

import React from "react"

interface ClientStoreMapProps {
  /** Coordenadas exactas guardadas en el admin; `null` si la tienda no las tiene. */
  position: { lat: number; lng: number } | null
  /** Nombre, dirección y ciudad para que Google busque la tienda cuando no hay coordenadas. */
  query: string
  name: string
  address: string
}

export function buildStoreMapEmbedUrl(position: ClientStoreMapProps["position"], query: string): string {
  // Con coordenadas exactas usamos `ll=` (sin el marcador rojo de Google) y encima va la estrella de One Star.
  // Sin coordenadas, `q=` deja que Google ubique la dirección con su propio marcador: nunca un punto inventado.
  if (position) {
    return `https://maps.google.com/maps?ll=${encodeURIComponent(`${position.lat},${position.lng}`)}&t=m&z=16&hl=es&output=embed`
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=m&z=16&hl=es&output=embed`
}

export default function ClientStoreMap({ position, query, name, address }: ClientStoreMapProps) {
  const embedUrl = buildStoreMapEmbedUrl(position, query)

  return (
    <div className="w-full h-full min-h-[208px] relative overflow-hidden bg-[#F3F4F6] group">
      <iframe
        title={`Mapa de Google Maps para ${name} (${address})`}
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: "208px" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full h-full block"
      />

      {/* Marcador central con la Estrella de One Star, solo sobre una ubicación exacta */}
      {position && (
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-10"
          aria-hidden="true"
        >
          <div className="relative flex items-center justify-center">
            {/* Halo de pulso GPS */}
            <span className="absolute h-11 w-11 rounded-full bg-[#E31C23]/25 animate-ping" />
            <span className="absolute h-10 w-10 rounded-full bg-[#1C1C1C]/15" />

            {/* Pin circular One Star con la estrella oficial */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#1C1C1C] border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-110">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="#E31C23"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                className="h-5 w-5 drop-shadow-sm"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </div>

          {/* Etiqueta compacta de la sede */}
          <span className="mt-1 rounded-full bg-[#1C1C1C]/90 px-2.5 py-0.5 font-barlow text-xs font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-xs">
            {name}
          </span>
        </div>
      )}
    </div>
  )
}
