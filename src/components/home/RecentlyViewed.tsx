"use client"

import { useSyncExternalStore } from "react"
import Image from "next/image"
import Link from "next/link"

import { canUseNextImageOptimization } from "@/lib/image-optimization"
import { formatCOP } from "@/lib/shop-utils"
import { useRecentlyViewedStore } from "@/store/recently-viewed.store"

const subscribeNoop = () => () => {}

/** Sección del constructor «Tus últimos vistos»: se oculta sola mientras el visitante no haya visto productos. */
export default function RecentlyViewed({ config = {} }: { config?: Record<string, unknown> }) {
  const items = useRecentlyViewedStore((state) => state.items)
  // La lista vive en el navegador: se pinta después de hidratar para no descuadrar el HTML del servidor.
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false)

  const title = typeof config.title === "string" && config.title.trim() ? config.title.trim() : "Tus últimos vistos"
  const subtitle = typeof config.subtitle === "string" ? config.subtitle : ""
  const limit = typeof config.limit === "number" && config.limit > 0 ? Math.min(config.limit, 12) : 8
  // Sin foto la tarjeta queda vacía: solo se muestran los que tienen imagen.
  const visible = hydrated ? items.filter((item) => item.imageUrl).slice(0, limit) : []
  if (visible.length === 0) return null

  return (
    <section aria-label={title} className="store-section" data-testid="recently-viewed">
      <div className="store-gutter mb-4 md:mb-6">
        <h2 className="store-heading">{title}</h2>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-[var(--store-muted)]">{subtitle}</p>}
      </div>
      <ul className="store-gutter flex snap-x [scroll-padding-inline:var(--store-gutter)] gap-3 overflow-x-auto pb-2 md:gap-4">
        {visible.map((item) => (
          <li key={item.id} className="w-36 shrink-0 snap-start md:w-44">
            <Link href={`/productos/${item.slug}`} className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-action)]">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-[var(--store-line)] bg-white">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.name} fill sizes="(min-width: 768px) 176px, 144px" unoptimized={!canUseNextImageOptimization(item.imageUrl)} className="object-contain p-2 transition-transform duration-300 group-hover:scale-105" />
                ) : null}
              </div>
              {item.brand && <p className="mt-2 font-barlow text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--store-muted)]">{item.brand}</p>}
              <p className="line-clamp-2 font-montserrat text-sm text-[var(--store-ink)]">{item.name}</p>
              <p className="mt-1 font-barlow font-bold text-[var(--store-ink)]">{formatCOP(item.price)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
