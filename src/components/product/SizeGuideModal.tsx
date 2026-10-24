"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"

export interface BrandSizeGuide {
  name?: string | null
  sizeGuideImageUrl?: string | null
  sizeGuideNote?: string | null
}

export interface SizeGuideModalProps {
  isOpen: boolean
  onClose: () => void
  brand?: BrandSizeGuide | null
}

const SIZE_TABLE = [
  { eu: 36, usH: "4",   usM: "5.5",  cm: "22.5" },
  { eu: 37, usH: "5",   usM: "6.5",  cm: "23"   },
  { eu: 38, usH: "6",   usM: "7.5",  cm: "24"   },
  { eu: 39, usH: "7",   usM: "8.5",  cm: "24.5" },
  { eu: 40, usH: "7.5", usM: "9",    cm: "25"   },
  { eu: 41, usH: "8",   usM: "9.5",  cm: "25.5" },
  { eu: 42, usH: "9",   usM: "10.5", cm: "26.5" },
  { eu: 43, usH: "10",  usM: "11.5", cm: "27"   },
  { eu: 44, usH: "11",  usM: "12.5", cm: "28"   },
  { eu: 45, usH: "12",  usM: "13",   cm: "29"   },
]

export default function SizeGuideModal({ isOpen, onClose, brand }: SizeGuideModalProps) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    previousActiveElementRef.current = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)

    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 50)

    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener("keydown", handler)
      previousActiveElementRef.current?.focus?.()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const title = brand?.name ? `Guía de Tallas — ${brand.name}` : "Guía de Tallas"
  const hasCustomImage = Boolean(brand?.sizeGuideImageUrl)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 touch-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/70 transition-opacity backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className="relative z-10 bg-white dark:bg-[#1C1C1C] w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-y-auto flex flex-col border border-gray-100 dark:border-white/10"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#1C1C1C]/95 backdrop-blur-sm flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#E0E0E0] dark:border-white/10">
          <h2
            id="size-guide-title"
            className="font-barlow font-bold text-base sm:text-lg uppercase tracking-wider text-[#1C1C1C] dark:text-white truncate pr-2"
          >
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 text-[#4A4A4A] dark:text-gray-300 hover:text-[#1C1C1C] dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar guía de tallas"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {hasCustomImage && brand?.sizeGuideImageUrl ? (
            <div className="overflow-auto max-h-[60vh] flex items-center justify-center bg-gray-50 dark:bg-black/20 rounded-xl p-2 sm:p-4">
              <Image
                src={brand.sizeGuideImageUrl}
                alt={`Guía oficial de tallas y medidas para ${brand.name ?? "calzado"}`}
                width={1000}
                height={1200}
                className="w-full h-auto max-h-[58vh] object-contain mx-auto select-none rounded-lg"
                sizes="(max-width: 768px) 95vw, 650px"
                priority={false}
              />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
              <table className="w-full text-sm font-montserrat text-left">
                <thead>
                  <tr className="bg-[#1C1C1C] text-white">
                    <th className="py-2.5 px-3 font-semibold">EU</th>
                    <th className="py-2.5 px-3 font-semibold">US (Hombre)</th>
                    <th className="py-2.5 px-3 font-semibold">US (Mujer)</th>
                    <th className="py-2.5 px-3 font-semibold">CM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {SIZE_TABLE.map((row, i) => (
                    <tr
                      key={row.eu}
                      className={
                        i % 2 === 0
                          ? "bg-white dark:bg-transparent"
                          : "bg-gray-50 dark:bg-white/5"
                      }
                    >
                      <td className="py-2.5 px-3 text-[#1C1C1C] dark:text-white font-medium">{row.eu}</td>
                      <td className="py-2.5 px-3 text-[#4A4A4A] dark:text-gray-300">{row.usH}</td>
                      <td className="py-2.5 px-3 text-[#4A4A4A] dark:text-gray-300">{row.usM}</td>
                      <td className="py-2.5 px-3 text-[#4A4A4A] dark:text-gray-300">{row.cm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Dynamic Brand Note */}
          {brand?.sizeGuideNote ? (
            <div className="p-3.5 bg-[#FFF3F3] dark:bg-red-950/20 border border-[#E31C23]/20 dark:border-[#E31C23]/30 text-xs font-montserrat text-[#4A4A4A] dark:text-red-200 rounded-xl">
              <span className="font-semibold text-[#E31C23]">
                {brand.name ? `Nota ${brand.name}:` : "Nota de tallas:"}
              </span>{" "}
              {brand.sizeGuideNote}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
