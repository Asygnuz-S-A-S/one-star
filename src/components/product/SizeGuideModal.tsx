"use client"

import { useEffect } from "react"

interface SizeGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

const SIZE_TABLE = [
  { eu: 36, usH: "4",    usM: "5.5",  cm: "22.5" },
  { eu: 37, usH: "5",    usM: "6.5",  cm: "23"   },
  { eu: 38, usH: "6",    usM: "7.5",  cm: "24"   },
  { eu: 39, usH: "7",    usM: "8.5",  cm: "24.5" },
  { eu: 40, usH: "7.5",  usM: "9",    cm: "25"   },
  { eu: 41, usH: "8",    usM: "9.5",  cm: "25.5" },
  { eu: 42, usH: "9",    usM: "10.5", cm: "26.5" },
  { eu: 43, usH: "10",   usM: "11.5", cm: "27"   },
  { eu: 44, usH: "11",   usM: "12.5", cm: "28"   },
  { eu: 45, usH: "12",   usM: "13",   cm: "29"   },
]

export default function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <h2
            id="size-guide-title"
            className="font-[var(--font-barlow)] font-bold text-lg uppercase tracking-wider text-[#1C1C1C]"
          >
            Guía de Tallas
          </h2>
          <button
            onClick={onClose}
            className="text-[#4A4A4A] hover:text-[#1C1C1C] transition-colors"
            aria-label="Cerrar guía de tallas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Table */}
        <div className="px-6 py-4 overflow-x-auto">
          <table className="w-full text-sm font-[var(--font-montserrat)]">
            <thead>
              <tr className="bg-[#1C1C1C] text-white">
                <th className="py-2 px-3 text-left font-semibold">EU</th>
                <th className="py-2 px-3 text-left font-semibold">US (H)</th>
                <th className="py-2 px-3 text-left font-semibold">US (M)</th>
                <th className="py-2 px-3 text-left font-semibold">CM</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_TABLE.map((row, i) => (
                <tr
                  key={row.eu}
                  className={i % 2 === 0 ? "bg-white" : "bg-[#F5F5F5]"}
                >
                  <td className="py-2 px-3 text-[#1C1C1C] font-medium">{row.eu}</td>
                  <td className="py-2 px-3 text-[#4A4A4A]">{row.usH}</td>
                  <td className="py-2 px-3 text-[#4A4A4A]">{row.usM}</td>
                  <td className="py-2 px-3 text-[#4A4A4A]">{row.cm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Hoka note */}
        <div className="mx-6 mb-6 p-3 bg-[#FFF3F3] border border-[#E31C23]/20 text-xs font-[var(--font-montserrat)] text-[#4A4A4A]">
          <span className="font-semibold text-[#E31C23]">Nota Hoka:</span>{" "}
          Los modelos Hoka tienen horma ancha. Se recomienda pedir media talla menos.
        </div>
      </div>
    </div>
  )
}
