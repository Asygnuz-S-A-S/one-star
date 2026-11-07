import Link from "next/link"
import type { ReactNode } from "react"

import { formatCOP } from "@/lib/shop-utils"

export interface PickupStoreOption {
  id: string
  name: string
  city: string | null
}

interface StoreStockRow {
  id: string
  name: string
  city: string | null
  stock: number
}

interface DeliveryOptionsProps {
  price: number
  freeThreshold: number
  delivery: { min: number; max: number }
  /** Tiendas activas donde se puede recoger (Admin → Tiendas). Sin tiendas no se ofrece. */
  pickupStores: PickupStoreOption[]
  availableInStores: boolean
  /** Talla elegida; sin talla no se puede decir en qué tienda hay. */
  selectedSize: string
  /** Existencias de esa talla por tienda (solo si el inventario trae el desglose). */
  storeStock: StoreStockRow[]
  /** true si el inventario trae stock por tienda; si no, se invita a preguntar. */
  hasStoreBreakdown: boolean
}

const icon = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true }

function Row({ icon: rowIcon, title, summary, children }: { icon: ReactNode; title: string; summary: string; children?: ReactNode }) {
  const body = (
    <>
      <span className="shrink-0 text-[#1C1C1C] dark:text-white">{rowIcon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-montserrat text-sm font-semibold text-[#1C1C1C] dark:text-white">{title}</span>
        <span className="block font-montserrat text-xs text-[#4A4A4A] dark:text-gray-400">{summary}</span>
      </span>
    </>
  )
  if (!children) return <div className="flex min-h-14 items-center gap-3 py-3">{body}</div>
  return (
    <details className="group">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
        {body}
        <svg {...icon} width={18} height={18} className="shrink-0 text-[#4A4A4A] transition-transform group-open:rotate-90"><path d="m9 6 6 6-6 6" /></svg>
      </summary>
      <div className="pb-4 pl-8">{children}</div>
    </details>
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
  selectedSize,
  storeStock,
  hasStoreBreakdown,
}: DeliveryOptionsProps) {
  const freeShipping = price >= freeThreshold
  const days = delivery.min === delivery.max ? `${delivery.min}` : `${delivery.min} a ${delivery.max}`

  return (
    <div className="divide-y divide-[#E0E0E0] border-y border-[#E0E0E0] dark:divide-white/10 dark:border-white/10" data-testid="delivery-options">
      <Row
        icon={<svg {...icon}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>}
        title="Despacho a domicilio"
        summary={`Llega en ${days} días hábiles · ${freeShipping ? "Envío gratis" : `Gratis desde ${formatCOP(freeThreshold)}`}`}
      />

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
          summary={selectedSize ? `Talla ${selectedSize}: dónde comprarla en persona` : "Elige una talla para ver disponibilidad"}
        >
          {!selectedSize ? (
            <p className="font-montserrat text-xs text-[#4A4A4A] dark:text-gray-300">Elige tu talla arriba y aquí verás en qué tienda la hay.</p>
          ) : hasStoreBreakdown ? (
            storeStock.length > 0 ? (
              <ul className="space-y-1" data-testid="store-stock">
                {storeStock.map((store) => (
                  <li key={store.id} className="font-montserrat text-xs text-[#4A4A4A] dark:text-gray-300">
                    <span className="font-semibold text-[#1C1C1C] dark:text-white">{store.name}</span>
                    {store.city ? ` (${store.city})` : ""}: {store.stock} disponible{store.stock !== 1 ? "s" : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-montserrat text-xs text-[#4A4A4A] dark:text-gray-300" data-testid="store-stock">Sin existencias en tiendas físicas para esta talla.</p>
            )
          ) : (
            <p className="font-montserrat text-xs text-[#4A4A4A] dark:text-gray-300" data-testid="store-stock">
              Pregunta por la talla {selectedSize} en nuestras tiendas.
            </p>
          )}
          <p className="mt-2 font-montserrat text-[11px] text-[#4A4A4A] dark:text-gray-400">
            El stock de tienda es para compra presencial: la web no lo aparta.{" "}
            <Link href="/tiendas" className="font-semibold underline underline-offset-2">Ver tiendas y horarios</Link>
          </p>
        </Row>
      )}
    </div>
  )
}
