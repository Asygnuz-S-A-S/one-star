"use client"

import React from "react"

interface StoreActionButtonsProps {
  name: string
  address: string
  city: string
  latitude: number | null
  longitude: number | null
}

export default function StoreActionButtons({ name, address, city, latitude, longitude }: StoreActionButtonsProps) {
  const handleShare = async () => {
    const shareData = {
      title: `One Star - ${name}`,
      text: `Visítanos en ${address}, ${city}.`,
      url: window.location.href,
    }
    
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`)
        alert("¡Enlace copiado al portapapeles!")
      }
    } catch (err) {
      console.error("Error al compartir", err)
    }
  }

  return (
    <div className="flex gap-3 mt-4">
      {latitude && longitude && (
        <a 
          href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center bg-[#1C1C1C] text-white hover:bg-gray-800 transition-colors py-2 font-[var(--font-barlow)] font-bold rounded flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          LLEGAR
        </a>
      )}
      
      <button 
        onClick={handleShare}
        className="flex-1 text-center border-2 border-[#1C1C1C] text-[#1C1C1C] hover:bg-gray-50 transition-colors py-2 font-[var(--font-barlow)] font-bold rounded flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        COMPARTIR
      </button>
    </div>
  )
}
