"use client"

import { useEffect } from "react"
import { useRecentlyViewedStore, type RecentlyViewedItem } from "@/store/recently-viewed.store"

/** Guarda la ficha en «Tus últimos vistos» (solo en este navegador). */
export default function TrackRecentlyViewed({ item }: { item: RecentlyViewedItem }) {
  const record = useRecentlyViewedStore((state) => state.record)
  const { id, slug, name, brand, imageUrl, price } = item
  useEffect(() => {
    record({ id, slug, name, brand, imageUrl, price })
  }, [record, id, slug, name, brand, imageUrl, price])
  return null
}
