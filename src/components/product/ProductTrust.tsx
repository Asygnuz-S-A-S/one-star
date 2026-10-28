import type { StorePromise, StorePromiseIcon } from "@/lib/store-promises"

const ICONS: Record<StorePromiseIcon, React.ReactNode> = {
  truck: <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 17.5a1.6 1.6 0 1 0 0-.01M17 17.5a1.6 1.6 0 1 0 0-.01" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  return: <path d="M4 9h11a5 5 0 0 1 0 10H8M4 9l4-4M4 9l4 4" />,
  shield: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
}

export function PromiseIcon({ icon, className = "h-5 w-5" }: { icon: StorePromiseIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ICONS[icon]}
    </svg>
  )
}

interface ProductTrustProps {
  promises: StorePromise[]
  whatsappUrl: string | null
}

/** Garantías junto al botón de compra: quitan el miedo justo donde el cliente decide. */
export default function ProductTrust({ promises, whatsappUrl }: ProductTrustProps) {
  // Envío y plazo ya los muestra ConversionSignals (con datos reales de este producto).
  const visible = promises.filter((p) => p.id === "returns" || p.id === "payment")
  return (
    <div className="flex flex-col gap-3" data-testid="product-trust">
      <ul className="grid grid-cols-1 gap-3 rounded-xl border border-[#E0E0E0] p-4 dark:border-white/10 sm:grid-cols-2">
        {visible.map((promise) => (
          <li key={promise.id} className="flex items-start gap-3">
            <span className="mt-0.5 text-[#1C1C1C] dark:text-white">
              <PromiseIcon icon={promise.icon} />
            </span>
            <span className="font-montserrat text-xs leading-snug">
              <strong className="block text-[#1C1C1C] dark:text-white">{promise.title}</strong>
              <span className="text-[#4A4A4A] dark:text-gray-400">{promise.text}</span>
            </span>
          </li>
        ))}
      </ul>
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-[#1C1C1C] px-4 py-3 font-barlow text-xs font-bold uppercase tracking-widest text-[#1C1C1C] transition-colors hover:bg-[#1C1C1C] hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
        >
          <PromiseIcon icon="chat" className="h-4 w-4" />
          ¿Dudas con la talla? Escríbenos por WhatsApp
        </a>
      )}
    </div>
  )
}
