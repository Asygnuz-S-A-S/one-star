import "server-only"

import { z } from "zod"

export function normalizeKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

const yesNo = z.preprocess((v) => {
  const s = String(v ?? "").trim().toUpperCase()
  if (s === "SI" || s === "SÍ") return true
  if (s === "NO" || s === "") return undefined
  return v
}, z.boolean().optional())

const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().url("URL inválida").optional()
)

const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v === null || v === undefined ? undefined : String(v).trim()),
  z.string().optional()
)

export const GENDER_VALUES = ["UNISEX", "HOMBRE", "MUJER", "NINO", "NINA", "INFANTIL", "BEBE"] as const
export type GenderValue = typeof GENDER_VALUES[number]

export const GENDER_ALIASES: Record<string, GenderValue> = {
  NINO: "NINO",
  NINOS: "NINO",
  "NIÑO": "NINO",
  "NIÑOS": "NINO",
  NINA: "NINA",
  NINAS: "NINA",
  "NIÑA": "NINA",
  "NIÑAS": "NINA",
  BEBE: "BEBE",
  "BEBÉ": "BEBE",
  BEBES: "BEBE",
  "BEBÉS": "BEBE",
  INFANTIL: "INFANTIL",
  INFANTILES: "INFANTIL",
  HOMBRE: "HOMBRE",
  HOMBRES: "HOMBRE",
  MUJER: "MUJER",
  MUJERES: "MUJER",
  UNISEX: "UNISEX",
}

export const BRAND_ALIASES: Record<string, string> = {
  ONCLOUD: "On",
  "ON CLOUD": "On",
  "ON-CLOUD": "On",
  "ON RUNNING": "On",
  "ACESSORIOS VANS": "Accesorios Vans",
  "ACCESORIOS VANS": "Accesorios Vans",
  "ACCESORIOS NIKE": "Accesorios Nike",
}

export function resolveBrandAlias(rawBrand: string): string {
  const trimmed = rawBrand.trim()
  const upper = trimmed.toUpperCase()
  return BRAND_ALIASES[upper] ?? BRAND_ALIASES[normalizeKey(trimmed).toUpperCase()] ?? trimmed
}

export const SKIPPED_BRANDS = [
  "BOLSAS DE VENTA",
  "BONO",
  "FALTA ORGANIZAR ESTA REFERENCIA",
] as const

export function isSkippedBrand(rawBrand: string): boolean {
  const norm = normalizeKey(rawBrand)
  return SKIPPED_BRANDS.some((sb) => normalizeKey(sb) === norm)
}

export interface SizeValidationResult {
  valid: boolean
  size?: string
  error?: string
  recoveredFromDate?: boolean
}

/**
 * Valida y normaliza una talla.
 * - Excel con fechas: si celda es fecha con formato d.m, o mes 5 con día 1-13 -> convierte a `${día}.${mes}`
 * - Medias tallas numéricas: 4, 4.5, 7.0 -> 7, 7.50 -> 7.5
 * - Sufijos permitidos: I, J, B (ej. 7I, 12J, 5B)
 * - Tallas únicas: "U", "Única"
 * - Rechaza cualquier otro valor con mensaje descriptivo.
 */
export function validateAndNormalizeSize(
  raw: unknown,
  cellMeta?: { z?: string; t?: string }
): SizeValidationResult {
  if (raw === undefined || raw === null || raw === "") {
    return { valid: false, error: "Talla vacía" }
  }

  // 1. Detectar fechas reales de Excel (objeto Date o celda marcada como fecha)
  const isDateObject = raw instanceof Date
  const isDateCell = cellMeta?.t === "d" || isDateObject

  if (isDateCell) {
    const d = raw instanceof Date ? raw : new Date(Number(raw))
    if (!isNaN(d.getTime())) {
      // Ajuste de 1000ms para evitar discrepancias por límites de medianoche (ej. 23:59:59.999Z)
      const adjusted = new Date(d.getTime() + 1000)
      const day = adjusted.getUTCDate()
      const month = adjusted.getUTCMonth() + 1
      const isFormatDM = Boolean(cellMeta?.z && cellMeta.z.toLowerCase().includes("d.m"))

      if (isFormatDM || (month === 5 && day >= 1 && day <= 13)) {
        return { valid: true, size: `${day}.${month}`, recoveredFromDate: true }
      }
      return { valid: false, error: "Talla inválida" }
    }
  }

  // 2. Si es string, verificar si luce como fecha de Excel exportada
  const str = String(raw).trim()
  if (str === "") {
    return { valid: false, error: "Talla vacía" }
  }

  // Detectar patrones de fecha en string: ej. "8-May", "8/5/2026", "2026-05-08"
  const dateStrMatch = str.match(/^(\d{1,2})[-/](may|mayo|0?5)(?:[-/]\d{2,4})?$/i)
  if (dateStrMatch) {
    const day = parseInt(dateStrMatch[1], 10)
    if (day >= 1 && day <= 13) {
      return { valid: true, size: `${day}.5`, recoveredFromDate: true }
    }
    return { valid: false, error: "Talla inválida" }
  }

  if (str.includes("/") || str.includes("-")) {
    const parsedDate = new Date(str)
    if (!isNaN(parsedDate.getTime()) && str.length > 5) {
      const day = parsedDate.getDate()
      const month = parsedDate.getMonth() + 1
      if (month === 5 && day >= 1 && day <= 13) {
        return { valid: true, size: `${day}.${month}`, recoveredFromDate: true }
      }
      return { valid: false, error: "Talla inválida" }
    }
  }

  // 3. Tallas especiales: U y Única
  const upper = str.toUpperCase()
  if (upper === "U") {
    return { valid: true, size: "U", recoveredFromDate: false }
  }
  const normKey = normalizeKey(str)
  if (normKey === "unica") {
    return { valid: true, size: "Única", recoveredFromDate: false }
  }

  // 4. Numérico con o sin sufijo (I, J, B)
  const numericMatch = str.match(/^(\d+(?:[.,]\d+)?)\s*([IJBijb])?$/)
  if (numericMatch) {
    const numPart = numericMatch[1].replace(",", ".")
    const num = parseFloat(numPart)
    if (!isNaN(num) && num > 0) {
      const decimal = Math.round((num % 1) * 10) / 10
      // Solo permitimos números enteros (.0) o medias tallas (.5)
      if (decimal !== 0 && decimal !== 0.5) {
        return { valid: false, error: "Talla inválida: ¿Excel la convirtió en fecha?" }
      }
      const canonicalNum = decimal === 0 ? Math.floor(num).toString() : `${Math.floor(num)}.5`
      const suffix = numericMatch[2] ? numericMatch[2].toUpperCase() : ""
      return { valid: true, size: `${canonicalNum}${suffix}`, recoveredFromDate: false }
    }
  }

  return { valid: false, error: "Talla inválida: ¿Excel la convirtió en fecha?" }
}

const preprocessGender = (v: unknown) => {
  if (v === undefined || v === null || v === "") return undefined
  const s = String(v).trim().toUpperCase()
  if (s === "") return undefined
  return GENDER_ALIASES[s] ?? s
}

/** Una fila del Excel una vez parseada y mapeada a nombres de campo estándar. */
export const productImportRowSchema = z
  .object({
    sku: z.string().trim().min(1, "SKU vacío"),
    name: z.string().trim().min(1, "Nombre del producto vacío"),
    brandName: z.string().trim().min(1, "Marca vacía"),
    categoryName: z.string().trim().min(1, "Categoría vacía"),
    gender: z.preprocess(
      preprocessGender,
      z.enum(GENDER_VALUES, {
        error: "Género inválido. Valores permitidos: UNISEX, HOMBRE, MUJER, NINO, NINA, INFANTIL, BEBE",
      }).optional()
    ),
    price: z.coerce.number({ message: "Precio inválido" }).nonnegative("Precio no puede ser negativo"),
    isOnSale: yesNo,
    salePrice: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : v),
      z.coerce.number().nonnegative().optional()
    ),
    description: z.string().trim().optional(),
    extendedDescription: z.string().trim().optional(),
    size: z.string().trim().min(1, "Talla vacía"),
    sizeUS: z.string().trim().optional(),
    sizeCM: z.string().trim().optional(),
    sizeEUR: z.string().trim().optional(),
    color: z.string().trim().min(1, "Color vacío"),
    stock: z.coerce.number().int("Stock debe ser un entero").nonnegative("Stock no puede ser negativo"),
    image1: optionalUrl,
    image2: optionalUrl,
    image3: optionalUrl,
    image4: optionalUrl,
    image5: optionalUrl,
    image6: optionalUrl,
    image7: optionalUrl,
    image8: optionalUrl,
    videoUrl: optionalUrl,
    photosFolderUrl: optionalString,
    readyFlag: optionalString,
    colorGroup: optionalString,
    isPublished: yesNo,
    availableOnline: yesNo,
    availableInStores: yesNo,
  })
  .refine((data) => !data.isOnSale || data.salePrice !== undefined, {
    message: "Precio de oferta requerido cuando ¿En oferta? = SI",
    path: ["salePrice"],
  })

export type ProductImportRow = z.infer<typeof productImportRowSchema>
