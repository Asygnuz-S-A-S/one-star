"use client"

import React, { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

const customIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E60000" stroke="#FFFFFF" stroke-width="1.5" width="36" height="36" style="filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.3));">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>`,
  className: "custom-star-icon",
  iconSize: [36, 36],
  iconAnchor: [18, 18], // Center of the star
})

interface MapPickerProps {
  position: { lat: number; lng: number } | null
  onChange: (lat: number, lng: number) => void
}

function LocationMarker({ position, onChange }: MapPickerProps) {
  const map = useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })

  // Center map when position changes from outside
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15) // Zoom in a bit when searching
    }
  }, [map, position?.lat, position?.lng])

  return position === null ? null : (
    <Marker position={position} icon={customIcon} />
  )
}

export default function AdminMapPicker({ position, onChange }: MapPickerProps) {
  // Centro por defecto (Manizales) si no hay posición
  const defaultCenter = { lat: 5.06889, lng: -75.51738 }

  return (
    <div className="w-full h-64 border border-gray-300 rounded overflow-hidden">
      <MapContainer
        center={position || defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <LocationMarker position={position} onChange={onChange} />
      </MapContainer>
    </div>
  )
}
