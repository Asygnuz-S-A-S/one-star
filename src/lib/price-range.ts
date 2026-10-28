export interface PriceBounds {
  min: number
  max: number
}

export type PriceSelection = PriceBounds

export function normalizePriceBounds(value: { min: number | null; max: number | null }): PriceBounds | null {
  const { min, max } = value
  if (min === null || max === null || !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
    return null
  }
  return { min, max }
}

export function normalizePriceSelection(selection: PriceSelection, bounds: PriceBounds): PriceSelection {
  const min = Math.min(Math.max(selection.min, bounds.min), bounds.max)
  const max = Math.min(Math.max(selection.max, bounds.min), bounds.max)
  return min <= max ? { min, max } : { min: bounds.min, max: bounds.max }
}

/** Gives roughly one hundred useful keyboard increments without inventing catalog limits. */
export function priceRangeStep(bounds: PriceBounds): number {
  const span = bounds.max - bounds.min
  if (span <= 0) return 1
  const rawStep = span / 100
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  return Math.max(1, Math.round(rawStep / magnitude) * magnitude)
}

export function buildPriceFilterSearch(
  currentSearch: string,
  bounds: PriceBounds,
  selection: PriceSelection,
): URLSearchParams {
  const next = new URLSearchParams(currentSearch)
  const normalized = normalizePriceSelection(selection, bounds)

  if (normalized.min > bounds.min) next.set("precio_min", String(normalized.min))
  else next.delete("precio_min")

  if (normalized.max < bounds.max) next.set("precio_max", String(normalized.max))
  else next.delete("precio_max")

  next.delete("page")
  return next
}
