import { normalizeColor, PLACEHOLDER_IMAGE_URL } from "@/lib/product-image"
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
  productId?: string
  slug?: string
  productName?: string
  /** Primera foto del color: la que representa la miniatura. */
  imageUrl?: string
  /**
   * Todas las fotos de ese color, en el orden en que llegan. La tarjeta las
   * recorre al pasar el cursor, para no mezclar fotos de colores distintos.
   */
  imageUrls: string[]
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

export interface ProductFamilyCardColorProduct {
  id: string
  slug: string
  name: string
  variants: readonly ProductCardColorVariant[]
  images: readonly ProductCardColorImage[]
}

export function buildProductCardColorSummary(
  variants: readonly ProductCardColorVariant[],
  images: readonly ProductCardColorImage[]
): ProductCardColorSummary {
  const seen = new Set<string>()
  const options: ProductCardColorOption[] = []
  const imagesByColor = new Map<string, string[]>()

  for (const image of images) {
    const imageUrl = image.url.trim()
    if (typeof image.color !== "string" || !isRealColor(image.color) || !imageUrl) continue
    const normalized = normalizeColor(image.color)
    const bucket = imagesByColor.get(normalized)
    if (bucket) bucket.push(imageUrl)
    else imagesByColor.set(normalized, [imageUrl])
  }

  for (const variant of variants) {
    if (typeof variant.color !== "string" || !isRealColor(variant.color)) continue
    const name = variant.color.trim()
    const normalized = normalizeColor(name)
    if (!normalized || seen.has(normalized)) continue

    seen.add(normalized)
    const imageUrls = imagesByColor.get(normalized) ?? []
    options.push({ name, ...(imageUrls[0] ? { imageUrl: imageUrls[0] } : {}), imageUrls })
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

export function buildProductFamilyCardColorSummary(
  products: readonly ProductFamilyCardColorProduct[]
): ProductCardColorSummary {
  const seenColors = new Set<string>()
  const options: ProductCardColorOption[] = []

  for (const product of products) {
    const productSummary = buildProductCardColorSummary(product.variants, product.images)
    for (const option of productSummary.options) {
      const normalized = normalizeColor(option.name)
      if (seenColors.has(normalized)) continue
      seenColors.add(normalized)
      const fallbackImageUrl = product.images[0]?.url?.trim() || PLACEHOLDER_IMAGE_URL
      const imageUrl = option.imageUrl ?? fallbackImageUrl
      options.push({
        ...option,
        imageUrl,
        imageUrls: option.imageUrls.length > 0 ? option.imageUrls : [imageUrl],
        productId: product.id,
        slug: product.slug,
        productName: product.name,
      })
    }
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
