import { normalizeColor } from "@/lib/product-image"
import { isRealColor } from "@/lib/colors"

export interface ProductCardColorVariant {
  color: string | null | undefined
}

export interface ProductCardColorImage {
  url: string
  color?: string | null
}

export interface ProductCardColorOption {
  name: string
  imageUrl?: string
}

export interface ProductCardColorImageOption extends ProductCardColorOption {
  imageUrl: string
}

export interface ProductCardColorSummary {
  options: ProductCardColorOption[]
  imageOptions: ProductCardColorImageOption[]
  visibleOptions: ProductCardColorOption[]
  hiddenCount: number
  total: number
  label: string | null
}

export const MAX_VISIBLE_PRODUCT_COLORS = 3

export function buildProductCardColorSummary(
  variants: readonly ProductCardColorVariant[],
  images: readonly ProductCardColorImage[]
): ProductCardColorSummary {
  const seen = new Set<string>()
  const options: ProductCardColorOption[] = []
  const firstImageByColor = new Map<string, string>()

  for (const image of images) {
    const imageUrl = image.url.trim()
    if (typeof image.color !== "string" || !isRealColor(image.color) || !imageUrl) continue
    const normalized = normalizeColor(image.color)
    if (!firstImageByColor.has(normalized)) {
      firstImageByColor.set(normalized, imageUrl)
    }
  }

  for (const variant of variants) {
    if (typeof variant.color !== "string" || !isRealColor(variant.color)) continue
    const name = variant.color.trim()
    const normalized = normalizeColor(name)
    if (!normalized || seen.has(normalized)) continue

    seen.add(normalized)
    const imageUrl = firstImageByColor.get(normalized)
    options.push({ name, ...(imageUrl ? { imageUrl } : {}) })
  }

  const total = options.length
  const imageOptions = options.filter(
    (option): option is ProductCardColorImageOption => Boolean(option.imageUrl)
  )

  return {
    options,
    imageOptions,
    visibleOptions: options.slice(0, MAX_VISIBLE_PRODUCT_COLORS),
    hiddenCount: Math.max(0, total - MAX_VISIBLE_PRODUCT_COLORS),
    total,
    label: total > 0 ? `${total} ${total === 1 ? "color" : "colores"}` : null,
  }
}
