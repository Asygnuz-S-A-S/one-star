"use client"

import { useState, useCallback } from "react"
import { useAdminHotkeys } from "@/hooks/useAdminHotkeys"
import HotkeysHelp from "./HotkeysHelp"

export default function AdminHotkeys() {
  const [showHelp, setShowHelp] = useState(false)

  const handleShowHelp = useCallback(() => setShowHelp(true), [])
  const handleCloseHelp = useCallback(() => setShowHelp(false), [])

  useAdminHotkeys({ onShowHelp: handleShowHelp })

  return (
    <>
      {/* Floating trigger — always visible, bottom-right of the admin area */}
      <button
        type="button"
        onClick={handleShowHelp}
        title="Atajos de teclado (?)"
        aria-label="Mostrar atajos de teclado"
        className="fixed bottom-5 right-5 z-40 w-8 h-8 flex items-center justify-center rounded-full bg-[#1C1C1C]/80 border border-white/10 text-white/50 hover:text-white hover:bg-[#1C1C1C] text-sm font-mono transition-all backdrop-blur-sm shadow-lg"
      >
        ?
      </button>

      {showHelp && <HotkeysHelp onClose={handleCloseHelp} />}
    </>
  )
}
