"use client"

import React from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MAP_TILE_ATTRIBUTION, MAP_TILE_MAX_ZOOM, MAP_TILE_URL } from "@/lib/map-tiles"

const customIcon = L.divIcon({
  html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;">
    <span style="position:absolute;width:36px;height:36px;border-radius:9999px;background:rgba(28,28,28,0.14);"></span>
    <span style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:#1C1C1C;border:2px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,0,0,0.22);">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FFFFFF" width="12" height="12">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </span>
  </div>`,
  className: "custom-star-icon",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -16],
})

interface ClientStoreMapProps {
  position: { lat: number; lng: number }
  name: string
  address: string
}

export default function ClientStoreMap({ position, name, address }: ClientStoreMapProps) {
  return (
    <div className="w-full h-full min-h-[192px] relative z-0 [&_.leaflet-tile-pane]:grayscale [&_.leaflet-tile-pane]:contrast-[0.9] [&_.leaflet-tile-pane]:brightness-[1.06] [&_.leaflet-control-attribution]:text-[8px] [&_.leaflet-control-attribution]:bg-white/60 [&_.leaflet-control-attribution]:opacity-40">
      <MapContainer
        center={position}
        zoom={16}
        zoomControl={false}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", zIndex: 0, background: "#F5F5F5" }}
      >
        <TileLayer
          attribution={MAP_TILE_ATTRIBUTION}
          url={MAP_TILE_URL}
          maxZoom={MAP_TILE_MAX_ZOOM}
        />
        <Marker position={position} icon={customIcon}>
          <Popup>
            <div className="p-0.5 font-[var(--font-montserrat)] text-xs">
              <strong className="font-[var(--font-barlow)] text-xs tracking-wide text-[#1C1C1C] uppercase block mb-0.5">{name}</strong>
              <span className="text-gray-500 text-[11px]">{address}</span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
