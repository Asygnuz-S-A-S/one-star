import type { ConversionSignal, ConversionSignalKind } from "@/lib/conversion-signals"

interface ConversionSignalsProps {
  signals: ConversionSignal[]
}

const ICONS: Record<ConversionSignalKind, React.ReactNode> = {
  shipping: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
      <circle cx="7" cy="17" r="1.6" />
      <circle cx="17" cy="17" r="1.6" />
    </svg>
  ),
  delivery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  scarcity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c1 3 4 4.5 4 8.5A4 4 0 0 1 8 11.5c0-1.5.5-2.5 1-3.5.5 1.5 1.5 2 2 2 0-3 .5-5 1-7z" />
      <path d="M8 15.5a4 4 0 0 0 8 0" />
    </svg>
  ),
}

/**
 * Mensajes de confianza y urgencia bajo los botones de compra (HU-12).
 * Solo se pinta lo que `getConversionSignals` decide con datos reales.
 */
export default function ConversionSignals({ signals }: ConversionSignalsProps) {
  if (signals.length === 0) return null

  return (
    <ul
      className="flex flex-col gap-1.5 -mt-1"
      aria-label="Información de compra"
      data-testid="conversion-signals"
    >
      {signals.map((signal) => {
        const urgent = signal.tone === "urgent"
        return (
          <li
            key={signal.kind}
            className={`flex items-center gap-2 font-[var(--font-montserrat)] text-[13px] leading-snug ${
              urgent ? "text-[#E31C23] font-semibold" : "text-[#4A4A4A] dark:text-gray-300"
            }`}
          >
            <span className={`h-4 w-4 shrink-0 ${urgent ? "text-[#E31C23]" : "text-[#1C1C1C] dark:text-white"}`}>
              {ICONS[signal.kind]}
            </span>
            <span>{signal.text}</span>
          </li>
        )
      })}
    </ul>
  )
}
