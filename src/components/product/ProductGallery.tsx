"use client"

import { useState } from "react"
import Image from "next/image"
import type { ProductImage } from "@/types/shop"

interface ProductGalleryProps {
  images: ProductImage[]
  videoUrl?: string | null
}

export default function ProductGallery({ images, videoUrl }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const [fading, setFading] = useState(false)

  const hasVideo = Boolean(videoUrl)
  const thumbnailCount = images.length + (hasVideo ? 1 : 0)

  function switchTo(index: number, video = false) {
    if (index === activeIndex && video === showVideo) return
    setFading(true)
    setTimeout(() => {
      setActiveIndex(index)
      setShowVideo(video)
      setFading(false)
    }, 150)
  }

  if (thumbnailCount === 0) {
    return (
      <div className="aspect-square bg-[#E0E0E0] flex items-center justify-center rounded-sm">
        <svg
          width="80"
          height="80"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-[#4A4A4A]/30"
        >
          <path
            d="M8 40 C8 40 12 28 24 28 C30 28 34 32 40 32 C46 32 52 28 56 30 L56 42 C56 44 54 46 52 46 L12 46 C10 46 8 44 8 42 Z"
            fill="currentColor"
          />
          <path d="M24 28 L20 18 L28 18 L32 28" fill="currentColor" opacity="0.6" />
        </svg>
      </div>
    )
  }

  const activeImage = images[activeIndex]

  return (
    <div className="flex flex-col gap-3">
      {/* Main display */}
      <div
        className="relative aspect-square bg-[#E0E0E0] overflow-hidden group cursor-zoom-in"
        style={{ transition: "opacity 0.15s" }}
      >
        <div
          className={`absolute inset-0 transition-opacity duration-150 ${fading ? "opacity-0" : "opacity-100"}`}
        >
          {showVideo && videoUrl ? (
            <video
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : activeImage ? (
            <Image
              src={activeImage.url}
              alt={activeImage.alt || "Imagen del producto"}
              fill
              className="object-cover object-center transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, 60vw"
              priority={activeIndex === 0}
            />
          ) : null}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {images.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => switchTo(idx, false)}
            className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 bg-[#E0E0E0] overflow-hidden border-2 transition-colors ${
              !showVideo && activeIndex === idx
                ? "border-[#1C1C1C]"
                : "border-transparent hover:border-[#4A4A4A]"
            }`}
            aria-label={img.alt || `Imagen ${idx + 1}`}
          >
            <Image
              src={img.url}
              alt={img.alt || `Miniatura ${idx + 1}`}
              fill
              className="object-cover object-center"
              sizes="80px"
            />
          </button>
        ))}

        {hasVideo && (
          <button
            onClick={() => switchTo(0, true)}
            className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 bg-[#1C1C1C] overflow-hidden border-2 transition-colors flex items-center justify-center ${
              showVideo ? "border-[#1C1C1C]" : "border-transparent hover:border-[#4A4A4A]"
            }`}
            aria-label="Ver video del producto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
              className="w-7 h-7"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
