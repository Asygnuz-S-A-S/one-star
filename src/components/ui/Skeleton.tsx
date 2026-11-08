/** Bloque gris que late mientras carga la página (respeta "reducir movimiento"). */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-[var(--store-radius-md,0.75rem)] bg-[#EEEEEE] motion-safe:animate-pulse dark:bg-white/10 ${className}`} />
}
