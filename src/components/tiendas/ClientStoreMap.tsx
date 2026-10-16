"use client"

import React from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MAP_TILE_ATTRIBUTION, MAP_TILE_MAX_ZOOM, MAP_TILE_URL } from "@/lib/map-tiles"

const customIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E60000" stroke="#FFFFFF" stroke-width="1.5" width="36" height="36" style="filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.3));">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>`,
  className: "custom-star-icon",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
})

interface ClientStoreMapProps {
  position: { lat: number; lng: number }
  name: string
  address: string
}

export default function ClientStoreMap({ position, name, address }: ClientStoreMapProps) {
  return (
    <div className="w-full h-full min-h-[200px] relative z-0">
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution={MAP_TILE_ATTRIBUTION}
          url={MAP_TILE_URL}
          maxZoom={MAP_TILE_MAX_ZOOM}
        />
        <Marker position={position} icon={customIcon}>
          <Popup>
            <strong>{name}</strong><br />
            {address}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
