import "server-only"
import {
  findManyProductColors,
  findProductColorByName,
  createProductColorRecord,
  updateProductColorRecord,
  deleteProductColorRecord,
  countVariantsUsingColor,
  getMaxProductColorPosition,
} from "../repositories/product-color.repository"
import type { ProductColorInput } from "../validators/product-color.validator"
import type { ColorPalette } from "@/lib/colors"
import type { ProductColor } from "@prisma/client"

export interface ProductColorDTO {
  id: string
  name: string
  hex: string
  position: number
  isActive: boolean
  /** Variantes que usan este color; permite avisar antes de eliminarlo. */
  usageCount?: number
}

function mapToDTO(color: ProductColor): ProductColorDTO {
  return {
    id: color.id,
    name: color.name,
    hex: color.hex,
    position: color.position,
    isActive: color.isActive,
  }
}

/** Colores para el panel de administración (incluye inactivos y uso). */
export async function getProductColorsForAdmin(): Promise<ProductColorDTO[]> {
  const colors = await findManyProductColors(false)
  return Promise.all(
    colors.map(async (c) => ({
      ...mapToDTO(c),
      usageCount: await countVariantsUsingColor(c.name),
    }))
  )
}

/** Colores activos, para el selector del formulario de producto. */
export async function getActiveProductColors(): Promise<ProductColorDTO[]> {
  const colors = await findManyProductColors(true)
  return colors.map(mapToDTO)
}

/**
 * Paleta `nombre → hex` para dibujar los swatches en la tienda y el admin.
 * Es lo que se pasa a los componentes de cliente.
 */
export async function getColorPalette(): Promise<ColorPalette> {
  const colors = await findManyProductColors(false)
  return Object.fromEntries(colors.map((c) => [c.name, c.hex]))
}

export async function createProductColor(input: ProductColorInput): Promise<ProductColorDTO> {
  const existing = await findProductColorByName(input.name)
  if (existing) {
    throw new Error(`Ya existe un color llamado "${input.name}".`)
  }

  const position = (await getMaxProductColorPosition()) + 1
  const created = await createProductColorRecord({
    name: input.name,
    hex: input.hex,
    isActive: input.isActive,
    position,
  })
  return mapToDTO(created)
}

export async function updateProductColor(
  id: string,
  input: ProductColorInput
): Promise<ProductColorDTO> {
  const existing = await findProductColorByName(input.name)
  if (existing && existing.id !== id) {
    throw new Error(`Ya existe otro color llamado "${input.name}".`)
  }

  const updated = await updateProductColorRecord(id, {
    name: input.name,
    hex: input.hex,
    isActive: input.isActive,
  })
  return mapToDTO(updated)
}

/**
 * Elimina un color de la paleta.
 * No toca las variantes que lo usaran: su nombre permanece como dato histórico
 * (se dibujará con el tono de respaldo hasta que se les asigne otro color).
 */
export async function deleteProductColor(id: string): Promise<void> {
  await deleteProductColorRecord(id)
}
