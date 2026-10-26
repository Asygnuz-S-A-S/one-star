"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"

export interface BrandSizeGuide {
  name?: string | null
  sizeGuideImageUrl?: string | null
  sizeGuideMenUrl?: string | null
  sizeGuideWomenUrl?: string | null
  sizeGuideKidsUrl?: string | null
  sizeGuideNote?: string | null
}

export interface SizeGuideModalProps {
  isOpen: boolean
  onClose: () => void
  brand?: BrandSizeGuide | null
  initialGender?: string | null
}

type GenderTab = "HOMBRE" | "MUJER" | "NINOS"

const MEN_SIZE_TABLE = [
  { eu: "38.5", us: "6",    uk: "5.5",  cm: "24" },
  { eu: "39",   us: "6.5",  uk: "6",    cm: "24.5" },
  { eu: "40",   us: "7",    uk: "6",    cm: "25" },
  { eu: "40.5", us: "7.5",  uk: "6.5",  cm: "25.5" },
  { eu: "41",   us: "8",    uk: "7",    cm: "26" },
  { eu: "42",   us: "8.5",  uk: "7.5",  cm: "26.5" },
  { eu: "42.5", us: "9",    uk: "8",    cm: "27" },
  { eu: "43",   us: "9.5",  uk: "8.5",  cm: "27.5" },
  { eu: "44",   us: "10",   uk: "9",    cm: "28" },
  { eu: "44.5", us: "10.5", uk: "9.5",  cm: "28.5" },
  { eu: "45",   us: "11",   uk: "10",   cm: "29" },
  { eu: "45.5", us: "11.5", uk: "10.5", cm: "29.5" },
  { eu: "46",   us: "12",   uk: "11",   cm: "30" },
]

const WOMEN_SIZE_TABLE = [
  { eu: "35",   us: "5",    uk: "2.5", cm: "22" },
  { eu: "35.5", us: "5.5",  uk: "3",   cm: "22.5" },
  { eu: "36",   us: "6",    uk: "3.5", cm: "23" },
  { eu: "36.5", us: "6.5",  uk: "4",   cm: "23.5" },
  { eu: "37.5", us: "7",    uk: "4.5", cm: "24" },
  { eu: "38",   us: "7.5",  uk: "5",   cm: "24.5" },
  { eu: "38.5", us: "8",    uk: "5.5", cm: "25" },
  { eu: "39",   us: "8.5",  uk: "6",   cm: "25.5" },
  { eu: "40",   us: "9",    uk: "6.5", cm: "26" },
  { eu: "40.5", us: "9.5",  uk: "7",   cm: "26.5" },
  { eu: "41",   us: "10",   uk: "7.5", cm: "27" },
  { eu: "42",   us: "10.5", uk: "8",   cm: "27.5" },
]

const KIDS_SIZE_TABLE = [
  { eu: "27.5", us: "10.5C", uk: "10",   cm: "16.5" },
  { eu: "28",   us: "11C",   uk: "10.5", cm: "17" },
  { eu: "29",   us: "11.5C", uk: "11",   cm: "17.5" },
  { eu: "30",   us: "12C",   uk: "11.5", cm: "18" },
  { eu: "31",   us: "12.5C", uk: "12",   cm: "18.5" },
  { eu: "31.5", us: "13C",   uk: "12.5", cm: "19" },
  { eu: "32",   us: "1Y",    uk: "13.5", cm: "20" },
  { eu: "33",   us: "1.5Y",  uk: "1",    cm: "20.5" },
  { eu: "33.5", us: "2Y",    uk: "1.5",  cm: "21" },
  { eu: "34",   us: "2.5Y",  uk: "2",    cm: "21.5" },
  { eu: "35",   us: "3Y",    uk: "2.5",  cm: "22" },
  { eu: "35.5", us: "3.5Y",  uk: "3",    cm: "22.5" },
]

export default function SizeGuideModal({ isOpen, onClose, brand, initialGender }: SizeGuideModalProps) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  const resolveInitialTab = (): GenderTab => {
    const g = (initialGender ?? "").toUpperCase()
    if (g === "MUJER" || g === "NINA") return "MUJER"
    if (g === "NINO" || g === "INFANTIL" || g === "BEBE") return "NINOS"
    return "HOMBRE"
  }

  const [selectedTab, setSelectedTab] = useState<GenderTab | null>(null)
  const activeTab = selectedTab ?? resolveInitialTab()

  const handleClose = useCallback(() => {
    setSelectedTab(null)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    previousActiveElementRef.current = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", handler)

    setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 50)

    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener("keydown", handler)
      previousActiveElementRef.current?.focus?.()
    }
  }, [isOpen, handleClose])

  if (!isOpen) return null

  const title = brand?.name ? `Guía de Tallas — ${brand.name}` : "Guía de Tallas"

  // Resolver imagen por género o fallback general
  const getTabCustomImage = (): string | null => {
    if (activeTab === "HOMBRE") {
      return brand?.sizeGuideMenUrl || brand?.sizeGuideImageUrl || null
    }
    if (activeTab === "MUJER") {
      return brand?.sizeGuideWomenUrl || brand?.sizeGuideImageUrl || null
    }
    return brand?.sizeGuideKidsUrl || brand?.sizeGuideImageUrl || null
  }

  const customImageUrl = getTabCustomImage()

  const currentTable =
    activeTab === "HOMBRE"
      ? MEN_SIZE_TABLE
      : activeTab === "MUJER"
      ? WOMEN_SIZE_TABLE
      : KIDS_SIZE_TABLE

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
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className="relative z-10 bg-white dark:bg-[#1C1C1C] w-full max-w-2xl max-h-[88vh] rounded-2xl shadow-2xl overflow-y-auto flex flex-col border border-gray-100 dark:border-white/10"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#1C1C1C]/95 backdrop-blur-sm flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#E0E0E0] dark:border-white/10">
          <h2
            id="size-guide-title"
            className="font-[var(--font-barlow)] font-bold text-base sm:text-lg uppercase tracking-wider text-[#1C1C1C] dark:text-white truncate pr-2"
          >
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={handleClose}
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

        {/* Gender Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 px-5 sm:px-6 pt-2">
          {(
            [
              { id: "HOMBRE", label: "Hombre" },
              { id: "MUJER", label: "Mujer" },
              { id: "NINOS", label: "Niños / Junior" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`pb-2.5 px-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? "border-[#E31C23] text-[#1C1C1C] dark:text-white"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {customImageUrl ? (
            <div className="overflow-auto max-h-[60vh] flex items-center justify-center bg-gray-50 dark:bg-black/20 rounded-xl p-2 sm:p-4">
              <Image
                src={customImageUrl}
                alt={`Guía oficial de tallas para ${brand?.name ?? "calzado"} (${activeTab})`}
                width={1000}
                height={1200}
                className="w-full h-auto max-h-[58vh] object-contain mx-auto select-none rounded-lg"
                sizes="(max-width: 768px) 95vw, 650px"
                priority={false}
              />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
              <table className="w-full text-sm font-[var(--font-montserrat)] text-left">
                <thead>
                  <tr className="bg-[#1C1C1C] text-white">
                    <th className="py-2.5 px-3 font-semibold">EU (Col)</th>
                    <th className="py-2.5 px-3 font-semibold">US</th>
                    <th className="py-2.5 px-3 font-semibold">UK</th>
                    <th className="py-2.5 px-3 font-semibold">CM (Centímetros)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {currentTable.map((row, i) => (
                    <tr
                      key={row.eu}
                      className={
                        i % 2 === 0
                          ? "bg-white dark:bg-transparent"
                          : "bg-gray-50 dark:bg-white/5"
                      }
                    >
                      <td className="py-2 px-3 text-[#1C1C1C] dark:text-white font-bold">{row.eu}</td>
                      <td className="py-2 px-3 text-[#4A4A4A] dark:text-gray-300">{row.us}</td>
                      <td className="py-2 px-3 text-[#4A4A4A] dark:text-gray-300">{row.uk}</td>
                      <td className="py-2 px-3 text-[#4A4A4A] dark:text-gray-300 font-medium">{row.cm} cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cómo medir tu pie */}
          <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
            <h4 className="font-[var(--font-barlow)] font-bold text-xs uppercase tracking-wider text-[#1C1C1C] dark:text-white mb-1.5 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#E31C23]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ¿Cómo medir tu pie para saber tu talla exacta?
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 font-[var(--font-montserrat)] leading-relaxed">
              1. Coloca una hoja de papel en el suelo pegada a una pared.<br />
              2. Apoya el talón contra la pared y marca la punta de tu dedo más largo con un lápiz.<br />
              3. Mide en centímetros (CM) la distancia desde el borde de la hoja hasta la marca y compárala en la tabla.
            </p>
          </div>

          {/* Dynamic Brand Note */}
          {brand?.sizeGuideNote ? (
            <div className="p-3.5 bg-[#FFF3F3] dark:bg-red-950/20 border border-[#E31C23]/20 dark:border-[#E31C23]/30 text-xs font-[var(--font-montserrat)] text-[#4A4A4A] dark:text-red-200 rounded-xl">
              <span className="font-semibold text-[#E31C23]">
                {brand.name ? `Nota de ${brand.name}:` : "Nota de calce:"}
              </span>{" "}
              {brand.sizeGuideNote}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
