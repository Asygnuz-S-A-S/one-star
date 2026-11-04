"use client"

import { useEffect, useState } from "react"
import { getPreferredBrandOptions } from "@/server/actions/brand-options.actions"

const NO_PREFERENCE = "Sin preferencia"

/** Opciones del campo "marca de preferencia". `current` conserva una marca ya guardada. */
export function usePreferredBrands(current = ""): string[] {
  const [brands, setBrands] = useState<string[]>([])

  useEffect(() => {
    getPreferredBrandOptions().then(setBrands).catch(() => {})
  }, [])

  return [...new Set([...brands, ...(current ? [current] : []), NO_PREFERENCE])]
}
