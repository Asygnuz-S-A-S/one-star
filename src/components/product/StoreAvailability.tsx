import Link from "next/link"

interface StoreOption {
  id: string
  name: string
  city: string | null
}

interface StoreAvailabilityProps {
  availableOnline: boolean
  availableInStores: boolean
  webStock: number
  /** Texto de tiendas (Admin → Contenido), el mismo de la fila «Stock en tienda». */
  storeText: string
  /** Sedes activas (Admin → Tiendas). Solo se nombran: no se dice cuántas unidades hay en cada una. */
  stores: StoreOption[]
}

function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  )
}

/**
 * Cierre de la ficha con la marca de One Star (tinta, gris claro y rojo; el cierre de compra de arriba ya es negro): dónde se consigue el producto.
 * Reemplaza las tarjetas verde y azul, que repetían lo de arriba y se veían genéricas (QA, 10 nov).
 */
export default function StoreAvailability({ availableOnline, availableInStores, webStock, storeText, stores }: StoreAvailabilityProps) {
  const online = availableOnline && webStock > 0
  if (!online && !availableInStores) return null

  return (
    <section className="py-12" aria-labelledby="titulo-disponibilidad">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[#E0E0E0] bg-[#F5F5F5] px-6 py-10 text-[#1C1C1C] sm:px-10 md:px-14 dark:border-white/10 dark:bg-white/5 dark:text-white">
          <Star className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 text-[#1C1C1C]/[0.04] dark:text-white/[0.04]" />
          <p className="font-barlow text-xs font-bold uppercase tracking-[0.2em] text-[#E31C23]">Disponibilidad</p>
          <h2 id="titulo-disponibilidad" className="mt-2 font-barlow text-3xl font-black uppercase leading-none tracking-tight md:text-4xl">
            Cómpralo como prefieras
          </h2>

          <div className="relative mt-8 grid gap-8 md:grid-cols-2 md:gap-0 md:divide-x md:divide-[#1C1C1C]/10 dark:md:divide-white/10">
            <div className="md:pr-10">
              <p className="flex items-center gap-2 font-barlow text-sm font-bold uppercase tracking-widest">
                <Star className="h-3.5 w-3.5 text-[#E31C23]" />
                En línea
              </p>
              <p className="mt-2 font-montserrat text-sm text-[#4A4A4A] dark:text-white/75">
                {online ? "Disponible. Envío a todo Colombia." : "Por ahora no se vende en línea."}
              </p>
            </div>

            {availableInStores && (
              <div className="md:pl-10">
                <p className="flex items-center gap-2 font-barlow text-sm font-bold uppercase tracking-widest">
                  <Star className="h-3.5 w-3.5 text-[#E31C23]" />
                  En tienda
                </p>
                <p className="mt-2 font-montserrat text-sm text-[#4A4A4A] dark:text-white/75">{storeText}</p>
                {stores.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {stores.map((store) => (
                      <li key={store.id} className="rounded-full border border-[#1C1C1C]/15 bg-white px-3 py-1 font-montserrat text-xs text-[#1C1C1C] dark:border-white/15 dark:bg-transparent dark:text-white/85">
                        {store.name}
                        {store.city ? ` · ${store.city}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/tiendas"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 font-barlow text-sm font-bold uppercase tracking-widest text-[#1C1C1C] underline-offset-4 hover:text-[#E31C23] dark:text-white hover:underline"
                >
                  Ver tiendas y horarios
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
