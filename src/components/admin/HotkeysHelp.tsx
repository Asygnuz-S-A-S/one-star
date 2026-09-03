"use client"

import { useEffect, useCallback } from "react"

interface HotkeysHelpProps {
  onClose: () => void
}

interface ShortcutItem {
  keys: string[][]
  desc: string
}

interface ShortcutSection {
  title: string
  items: ShortcutItem[]
}

const SECTIONS: ShortcutSection[] = [
  {
    title: "Navegación",
    items: [
      { keys: [["g"], ["p"]], desc: "Ir a Productos" },
      { keys: [["g"], ["o"]], desc: "Ir a Pedidos" },
      { keys: [["g"], ["c"]], desc: "Ir a Clientes" },
      { keys: [["g"], ["b"]], desc: "Ir a Landing Builder" },
    ],
  },
  {
    title: "Acciones",
    items: [
      { keys: [["n"]], desc: "Crear nuevo (en páginas con acción de creación)" },
      { keys: [["Esc"]], desc: "Cerrar modal o panel activo" },
    ],
  },
  {
    title: "General",
    items: [
      { keys: [["?"]], desc: "Mostrar esta ayuda" },
    ],
  },
]

function Kbd({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1.5 rounded-md border border-[#3A3A3A] bg-[#2A2A2A] text-white/90 text-xs font-mono font-semibold shadow-[0_2px_0_#111]">
      {label}
    </kbd>
  )
}

function KeySequence({ keys }: { keys: string[][] }) {
  return (
    <span className="flex items-center gap-1.5">
      {keys.map((group, gi) => (
        <span key={gi} className="flex items-center gap-1">
          {gi > 0 && (
            <span className="text-white/30 text-xs mx-0.5">then</span>
          )}
          {group.map((k, ki) => (
            <Kbd key={ki} label={k} />
          ))}
        </span>
      ))}
    </span>
  )
}

export default function HotkeysHelp({ onClose }: HotkeysHelpProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [handleEscape])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Atajos de teclado"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg rounded-2xl bg-[#1C1C1C] border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div>
            <h2 className="font-barlow font-bold text-lg text-white tracking-tight">
              Atajos de teclado
            </h2>
            <p className="font-montserrat text-xs text-white/40 mt-0.5">
              Presiona <Kbd label="?" /> en cualquier momento para abrir esta ayuda
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Shortcut list */}
        <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="font-montserrat text-[11px] font-semibold text-[#E31C23] uppercase tracking-widest mb-3">
                {section.title}
              </p>
              <ul className="space-y-2.5">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-4">
                    <span className="font-montserrat text-sm text-white/70">
                      {item.desc}
                    </span>
                    <KeySequence keys={item.keys} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <p className="font-montserrat text-xs text-white/30 text-center">
            Los atajos no se activan mientras escribes en campos de texto
          </p>
        </div>
      </div>
    </div>
  )
}
