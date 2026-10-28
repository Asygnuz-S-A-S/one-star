"use client"

import { useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { useAdminHotkeys } from "@/hooks/useAdminHotkeys"
import HotkeysHelp from "./HotkeysHelp"

export default function AdminHotkeys() {
  const [showHelp, setShowHelp] = useState(false)

  const handleShowHelp = useCallback(() => setShowHelp(true), [])
  const handleCloseHelp = useCallback(() => setShowHelp(false), [])

  useAdminHotkeys({ onShowHelp: handleShowHelp })
  const pathname = usePathname()

  if (pathname.startsWith("/admin/landing-builder")) return null

  return (
    <>
      {/* Floating trigger — always visible, bottom-right of the admin area */}
      <button
        type="button"
        onClick={handleShowHelp}
        title="Atajos de teclado (?)"
        aria-label="Mostrar atajos de teclado"
        className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#1C1C1C]/80 text-sm font-mono text-white/50 backdrop-blur-sm hover:bg-[#1C1C1C] hover:text-white"
      >
        ?
      </button>

      {showHelp && <HotkeysHelp onClose={handleCloseHelp} />}
    </>
  )
}
