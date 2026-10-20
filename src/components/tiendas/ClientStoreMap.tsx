"use client"

import React from "react"

interface ClientStoreMapProps {
  position: { lat: number; lng: number }
  name: string
  address: string
}

export default function ClientStoreMap({ position, name, address }: ClientStoreMapProps) {
  const query = `${position.lat},${position.lng}`
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=m&z=16&hl=es&iwloc=near&output=embed`

  return (
    <div className="w-full h-full min-h-[208px] relative overflow-hidden bg-[#F3F4F6]">
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
    </div>
  )
}
