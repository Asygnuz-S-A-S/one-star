"use client"

import { useEffect, useRef } from "react"
import { META_CURRENCY, trackMetaEvent } from "@/lib/tracking/meta-pixel"

interface MetaViewContentProps {
  productId: string
  name: string
  category: string
  price: number
}

/**
 * Dispara `ViewContent` una vez por ficha de producto abierta. El ref evita el
 * doble disparo del StrictMode en desarrollo y re-renders con el mismo producto.
 */
export default function MetaViewContent({ productId, name, category, price }: MetaViewContentProps) {
  const lastTrackedProductId = useRef<string | null>(null)

  useEffect(() => {
    if (lastTrackedProductId.current === productId) return
    lastTrackedProductId.current = productId
    trackMetaEvent("ViewContent", {
      content_type: "product",
      content_ids: [productId],
      content_name: name,
      content_category: category,
      value: price,
      currency: META_CURRENCY,
    })
  }, [productId, name, category, price])

  return null
}
