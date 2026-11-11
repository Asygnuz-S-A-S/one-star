"use client"

import Link from "next/link"
import { useId, useState, type ReactNode } from "react"

import { formatCOP } from "@/lib/shop-utils"

export interface PickupStoreOption {
  id: string
  name: string
  city: string | null
}

interface DeliveryOptionsProps {
  price: number
  freeThreshold: number
  delivery: { min: number; max: number }
  /** Tiendas activas donde se puede recoger (Admin → Tiendas). Sin tiendas no se ofrece. */
  pickupStores: PickupStoreOption[]
  availableInStores: boolean
  /**
   * Texto de la fila «Stock en tienda» (Admin → Contenido). No se nombra una sede:
   * One Star traslada entre tiendas, así que cualquier tienda puede conseguir la talla.
   */
  storeStockText: string
}

const icon = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true }

function Row({ icon: rowIcon, title, summary, children }: { icon: ReactNode; title: string; summary: string; children?: ReactNode }) {
  // Botón con estado propio: <details> con flex no abre en algunos Safari de iPhone.
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const body = (
    <>
      <span className="shrink-0 text-[#1C1C1C] dark:text-white">{rowIcon}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-montserrat text-sm font-semibold text-[#1C1C1C] dark:text-white">{title}</span>
        <span className="block font-montserrat text-xs text-[#4A4A4A] dark:text-gray-400">{summary}</span>
      </span>
    </>
  )
  if (!children) return <div className="flex min-h-14 items-center gap-3 py-3">{body}</div>
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-14 w-full items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-action)]"
      >
        {body}
        <svg {...icon} width={18} height={18} className={`shrink-0 text-[#4A4A4A] transition-transform ${open ? "rotate-90" : ""}`}><path d="m9 6 6 6-6 6" /></svg>
      </button>
      <div id={panelId} hidden={!open} className="pb-4 pl-8">{children}</div>
    </div>
  )
}

/**
 * Cómo recibir el producto, como en las fichas de los grandes retailers: despacho, retiro y stock
 * por tienda en filas que se despliegan. Todo sale de Configuración y del inventario; nada se inventa.
 */
export default function DeliveryOptions({
  price,
  freeThreshold,
  delivery,
  pickupStores,
  availableInStores,
  storeStockText,
}: DeliveryOptionsProps) {
  const freeShipping = price >= freeThreshold
  const days = delivery.min === delivery.max ? `${delivery.min}` : `${delivery.min} a ${delivery.max}`

  return (
    <div className="divide-y divide-[#E0E0E0] border-y border-[#E0E0E0] dark:divide-white/10 dark:border-white/10" data-testid="delivery-options">
      <Row
        icon={<svg {...icon}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>}
        title="Despacho a domicilio"
        summary={`Llega en ${days} días hábiles · ${freeShipping ? "Envío gratis" : `Gratis desde ${formatCOP(freeThreshold)}`}`}
      >
        <p className="font-montserrat text-xs text-[#4A4A4A] dark:text-gray-300">
          Enviamos con Envía a toda Colombia. Cuando sale tu pedido te llega la guía por correo y puedes seguirlo en{" "}
          <Link href="/rastrear-pedido" className="font-semibold underline underline-offset-2">Rastrear mi pedido</Link>.
        </p>
        <p className="mt-2 font-montserrat text-[11px] text-[#4A4A4A] dark:text-gray-400">
          {freeShipping ? "Este producto tiene envío gratis." : `Envío gratis en compras desde ${formatCOP(freeThreshold)}.`}{" "}
          <Link href="/envios-y-devoluciones" className="font-semibold underline underline-offset-2">Envíos y devoluciones</Link>
        </p>
      </Row>

      {pickupStores.length > 0 && (
        <Row
          icon={<svg {...icon}><path d="M4 10h16l-1-5H5zM5 10v9h14v-9M10 19v-5h4v5" /></svg>}
          title="Retira en tienda"
          summary={`Gratis · ${pickupStores.length} tienda${pickupStores.length !== 1 ? "s" : ""} · eliges la tienda al pagar`}
        >
          <ul className="space-y-1">
            {pickupStores.map((store) => (
              <li key={store.id} className="font-montserrat text-xs text-[#4A4A4A] dark:text-gray-300">
                <span className="font-semibold text-[#1C1C1C] dark:text-white">{store.name}</span>
                {store.city ? ` · ${store.city}` : ""}
              </li>
            ))}
          </ul>
          <p className="mt-2 font-montserrat text-[11px] text-[#4A4A4A] dark:text-gray-400">Te avisamos por correo cuando esté listo para recoger.</p>
        </Row>
      )}

      {availableInStores && (
        <Row
          icon={<svg {...icon}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>}
          title="Stock en tienda"
          summary={storeStockText}
        >
          <p className="font-montserrat text-xs text-[#4A4A4A] dark:text-gray-300">
            Si tu talla no está en la tienda que visitas, te la trasladamos desde otra sede.{" "}
            <Link href="/tiendas" className="font-semibold underline underline-offset-2">Ver tiendas y horarios</Link>
          </p>
        </Row>
      )}
    </div>
  )
}
