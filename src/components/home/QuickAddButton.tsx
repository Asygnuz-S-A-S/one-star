"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/store"
import { getQuickAddVariantsAction } from "@/server/actions/product.actions"
import { trackLeadCartStageAction } from "@/server/actions/lead-stage.actions"
import { META_CURRENCY, trackMetaEvent } from "@/lib/tracking/meta-pixel"

type QuickAddVariant = Awaited<ReturnType<typeof getQuickAddVariantsAction>>[number]

interface QuickAddButtonProps {
  id: string
  slug?: string
  name: string
  brand?: string
  imageUrl?: string
  price: number
  salePrice?: number
  isOnSale?: boolean
  hasStock: boolean
}

/** Agregar al carrito desde la tarjeta: pide las tallas con stock y deja elegir una sin salir del catálogo. */
export default function QuickAddButton({ id, slug, name, brand, imageUrl, price, salePrice, isOnSale, hasStock }: QuickAddButtonProps) {
  const router = useRouter()
  const { addItem, openCart } = useCart()
  const [variants, setVariants] = useState<QuickAddVariant[] | null>(null)
  const [loading, setLoading] = useState(false)
  const href = slug ? `/productos/${slug}` : undefined

  const add = (variant: QuickAddVariant) => {
    const effectivePrice = isOnSale && salePrice ? Number(salePrice) : Number(price)
    addItem({
      id: variant.id,
      productId: id,
      slug: slug ?? "",
      name,
      brand: brand ?? null,
      imageUrl: imageUrl ?? null,
      size: variant.size,
      color: variant.color,
      price: effectivePrice,
      originalPrice: Number(price),
      sku: variant.sku,
      maxQuantity: variant.stock,
    })
    void trackLeadCartStageAction({ productId: id, variantId: variant.id, productName: name }).catch(() => {})
    trackMetaEvent("AddToCart", {
      content_type: "product",
      content_ids: [id],
      content_name: name,
      contents: [{ id, quantity: 1, item_price: effectivePrice }],
      value: effectivePrice,
      currency: META_CURRENCY,
    })
    setVariants(null)
    openCart()
  }

  const open = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (variants) return setVariants(null)
    setLoading(true)
    const found = await getQuickAddVariantsAction(id).finally(() => setLoading(false))
    // Varios colores en el mismo producto o sin tallas: se elige en la ficha.
    if (found.length === 0 || new Set(found.map((v) => v.color)).size > 1) {
      if (href) router.push(href)
      return
    }
    if (found.length === 1) return add(found[0])
    setVariants(found)
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={!hasStock || loading}
        aria-expanded={Boolean(variants)}
        aria-label={hasStock ? `Agregar ${name} al carrito` : `${name} agotado`}
        title={hasStock ? "Agregar al carrito" : "Agotado"}
        className="relative z-20 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--store-line)] bg-white text-[var(--store-ink)] transition-colors duration-200 hover:border-[var(--store-action)] hover:bg-[var(--store-action)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-action)] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-transparent dark:text-white"
      >
        {loading ? (
          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
        ) : (
          // Carrito con "+": se lee como "agregar al carrito", no como una bolsa cualquiera.
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 3h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L20 8" />
            <circle cx="9" cy="20" r="1.3" />
            <circle cx="17" cy="20" r="1.3" />
            <path d="M14 3v6M11 6h6" />
          </svg>
        )}
      </button>

      {variants && (
        <div
          role="dialog"
          aria-label={`Elige la talla de ${name}`}
          className="absolute inset-x-2 bottom-16 z-30 rounded-[var(--store-radius-md)] bg-white p-3 shadow-[var(--store-elevation-raised)] ring-1 ring-black/5"
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-barlow text-xs font-bold uppercase tracking-[0.16em] text-[var(--store-ink)]">Elige tu talla</span>
            <button type="button" onClick={() => setVariants(null)} aria-label="Cerrar tallas" className="grid h-8 w-8 place-items-center rounded-full text-[var(--store-muted)] hover:bg-black/5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => add(variant)}
                className="min-h-10 min-w-11 rounded-full border border-[var(--store-line)] px-3 text-sm font-semibold text-[var(--store-ink)] transition-colors hover:border-[var(--store-ink)] hover:bg-[var(--store-ink)] hover:text-white"
              >
                {variant.size}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
