import "server-only"

import crypto from "node:crypto"
import * as fflate from "fflate"
import * as XLSX from "xlsx"
import { findManyCategories } from "@/server/repositories/category.repository"
import { findManyBrands } from "@/server/repositories/brand.repository"
import { parseSku } from "@/lib/sku"
import {
  findProductsByBaseSkus,
  findProductsByIdsForImport,
  findVariantsBySkus,
  type ProductForImport,
} from "@/server/repositories/product.repository"
import { persistProductImport } from "@/server/repositories/product-import.repository"
import { isErpCatalogOwner } from "@/server/services/catalog-source.service"
import {
  isSkippedBrand,
  normalizeKey,
  productImportRowSchema,
  resolveBrandAlias,
  validateAndNormalizeSize,
  type ProductImportRow,
} from "@/server/validators/product-import.validator"

export function normalizeVariantSize(size: string): string {
  const trimmed = size.trim()
  const res = validateAndNormalizeSize(trimmed)
  if (res.valid && res.size) {
    return res.size
  }
  const clean = trimmed.replace(/,/, ".")
  if (/^\d+\.0$/.test(clean)) {
    return clean.slice(0, -2)
  }
  return clean.toLowerCase()
}


export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
export const MAX_ENTRY_UNCOMPRESSED_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB
export const MAX_TOTAL_UNCOMPRESSED_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
export const MAX_SHEET_ROWS = 5000 // Máximo 5.000 filas de datos
export const MAX_COLUMNS = 40 // Máximo 40 columnas
export const MAX_CELL_LENGTH = 5000 // Máximo 5.000 caracteres por celda
export const ALLOWED_FILE_EXTENSION = ".xlsx"
export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
  "application/x-zip-compressed",
  "application/zip",
  "",
])

export const DANGEROUS_KEYS: ReadonlySet<string> = new Set([
  "__proto__",
  "constructor",
  "prototype",
])

export const TEMPLATE_COLUMNS = [
  "sku", "name", "brandName", "categoryName", "gender", "price", "isOnSale", "salePrice",
  "description", "extendedDescription", "size", "sizeUS", "sizeCM", "sizeEUR", "color", "stock",
  "image1", "image2", "image3", "image4", "image5", "image6", "image7", "image8", "videoUrl",
  "photosFolderUrl", "readyFlag", "colorGroup", "isPublished", "availableOnline", "availableInStores",
  "isFeatured", "isLaunch", "highlights", "faqs", "metaTitle", "metaDescription",
] as const

/**
 * Valida los límites de entrada del archivo (extensión, tamaño y MIME type)
 * ANTES de cargarlo en memoria o parsearlo.
 */
export function validateImportFile(file: { name: string; size: number; type?: string }): void {
  const fileName = file.name.trim()
  if (!fileName.toLowerCase().endsWith(ALLOWED_FILE_EXTENSION)) {
    throw new Error(
      "Solo se admiten archivos con extensión .xlsx. No se permiten archivos .xls, .xlsm ni otros formatos."
    )
  }

  if (file.size <= 0) {
    throw new Error("El archivo está vacío.")
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `El archivo excede el tamaño máximo permitido de ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB.`
    )
  }

  const mime = (file.type ?? "").toLowerCase().trim()
  if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
    throw new Error(
      "El tipo de contenido del archivo no es compatible con un libro de Excel (.xlsx)."
    )
  }
}

/**
 * Protege contra archivos ZIP maliciosos (zip bomb) revisando los tamaños
 * descomprimidos declarados en el directorio central del ZIP sin descomprimir
 * el contenido en memoria.
 */
export function validateZipSafety(buffer: ArrayBuffer | Uint8Array): void {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)

  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("El archivo no es un archivo ZIP / XLSX válido.")
  }

  let totalUncompressedSize = 0

  try {
    fflate.unzipSync(bytes, {
      filter(file) {
        const originalSize = file.originalSize ?? 0
        if (originalSize > MAX_ENTRY_UNCOMPRESSED_SIZE_BYTES) {
          throw new Error(
            `El archivo contiene un elemento descomprimido que excede el límite de seguridad (máx 20 MB). Elemento: "${file.name}".`
          )
        }
        totalUncompressedSize += originalSize
        if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED_SIZE_BYTES) {
          throw new Error(
            "El tamaño total descomprimido del archivo excede el límite de seguridad permitido (máx 50 MB)."
          )
        }
        return false
      },
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("límite de seguridad")) {
      throw err
    }
    throw new Error(
      `El archivo no pudo ser verificado contra zip bomb o está dañado: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

/**
 * Convierte un arreglo de celdas a un objeto plano protegido contra contaminación
 * de prototipo (ignora __proto__, constructor, prototype y crea con prototype null).
 */
export function rowArrayToObject(
  row: unknown[],
  headers?: unknown[]
): Record<string, unknown> {
  const obj: Record<string, unknown> = Object.create(null)
  const keys = headers ?? TEMPLATE_COLUMNS

  keys.forEach((rawKey, idx) => {
    const key = String(rawKey ?? "").trim()
    if (!key) return
    const lower = key.toLowerCase()

    if (DANGEROUS_KEYS.has(lower) || DANGEROUS_KEYS.has(key)) {
      return
    }

    obj[key] = row[idx] ?? ""
  })

  return obj
}

export const COLUMN_HEADER_ALIASES: Record<string, string> = {
  // SKU
  SKU: "sku",
  CODIGO: "sku",
  REFERENCIA: "sku",
  // Nombre
  "NOMBRE DEL PRODUCTO": "name",
  NOMBRE: "name",
  PRODUCTO: "name",
  NAME: "name",
  // Marca
  MARCA: "brandName",
  BRAND: "brandName",
  BRANDNAME: "brandName",
  // Categoría
  CATEGORIA: "categoryName",
  "CATEGORÍA": "categoryName",
  CATEGORY: "categoryName",
  CATEGORYNAME: "categoryName",
  // Género
  GENERO: "gender",
  "GÉNERO": "gender",
  GENDER: "gender",
  // Precio
  PRECIO: "price",
  PRICE: "price",
  BASEPRICE: "price",
  // En oferta
  "EN OFERTA?": "isOnSale",
  "¿EN OFERTA?": "isOnSale",
  "EN OFERTA": "isOnSale",
  "¿EN OFERTA": "isOnSale",
  OFERTA: "isOnSale",
  ISONSALE: "isOnSale",
  // Precio en oferta
  "PRECIO EN OFERTA": "salePrice",
  "PRECIO DE OFERTA": "salePrice",
  "PRECIO OFERTA": "salePrice",
  SALEPRICE: "salePrice",
  // Descripción corta
  "DESCRIPCION CORTA": "description",
  "DESCRIPCIÓN CORTA": "description",
  DESCRIPTION: "description",
  // Descripción larga
  "DESCRIPCION LARGA": "extendedDescription",
  "DESCRIPCIÓN LARGA": "extendedDescription",
  "DESCRIPCION LARGAL": "extendedDescription",
  "DESCRIPCIÓN LARGAL": "extendedDescription",
  EXTENDEDDESCRIPTION: "extendedDescription",
  // Talla
  TALLA: "size",
  SIZE: "size",
  // Tallas adicionales
  "TALLA US": "sizeUS",
  SIZEUS: "sizeUS",
  "TALLA CM": "sizeCM",
  SIZECM: "sizeCM",
  "TALLA EUR": "sizeEUR",
  SIZEEUR: "sizeEUR",
  // Color
  COLOR: "color",
  // Stock
  STOCK: "stock",
  // URL fotos (carpeta Drive)
  "URL FOTOS": "photosFolderUrl",
  "URL FOTO": "photosFolderUrl",
  "CARPETA FOTOS": "photosFolderUrl",
  "LINK FOTOS": "photosFolderUrl",
  PHOTOSFOLDERURL: "photosFolderUrl",
  // Publicado
  PUBLICADO: "isPublished",
  "¿PUBLICADO?": "isPublished",
  ISPUBLISHED: "isPublished",
  // Disponible online
  "DISPONIBLE ONLINE": "availableOnline",
  "¿DISPONIBLE ONLINE?": "availableOnline",
  AVAILABLEONLINE: "availableOnline",
  // Disponible en tiendas físicas
  "DISPONIBLE EN TIENDAS FISICAS": "availableInStores",
  "DISPONIBLE EN TIENDAS FÍSICAS": "availableInStores",
  "¿DISPONIBLE EN TIENDAS FISICAS?": "availableInStores",
  "¿DISPONIBLE EN TIENDAS FÍSICAS?": "availableInStores",
  AVAILABLEINSTORES: "availableInStores",
  // Producto listo
  "PRODUCTO LISTO": "readyFlag",
  LISTO: "readyFlag",
  "¿LISTO?": "readyFlag",
  READYFLAG: "readyFlag",
  // Video
  "VIDEO URL": "videoUrl",
  "URL VIDEO": "videoUrl",
  VIDEO: "videoUrl",
  VIDEOURL: "videoUrl",
  // Imágenes 1 a 8
  "URL IMAGEN 1": "image1",
  IMAGE1: "image1",
  "URL IMAGEN 2": "image2",
  IMAGE2: "image2",
  "URL IMAGEN 3": "image3",
  IMAGE3: "image3",
  "URL IMAGEN 4": "image4",
  IMAGE4: "image4",
  "URL IMAGEN 5": "image5",
  IMAGE5: "image5",
  "URL IMAGEN 6": "image6",
  IMAGE6: "image6",
  "URL IMAGEN 7": "image7",
  IMAGE7: "image7",
  "URL IMAGEN 8": "image8",
  IMAGE8: "image8",
  // Grupo de color / Modelo
  "GRUPO COLOR": "colorGroup",
  "GRUPO DE COLOR": "colorGroup",
  "COLOR GROUP": "colorGroup",
  COLORGROUP: "colorGroup",
  "MODELO BASE": "colorGroup",
  "REFERENCIA COLOR": "colorGroup",
  "FAMILIA COLOR": "colorGroup",
  // Lanzamiento
  LANZAMIENTO: "isLaunch",
  "¿LANZAMIENTO?": "isLaunch",
  "ES LANZAMIENTO": "isLaunch",
  ISLAUNCH: "isLaunch",
  LAUNCH: "isLaunch",
  // Destacado
  DESTACADO: "isFeatured",
  "¿DESTACADO?": "isFeatured",
  "ES DESTACADO": "isFeatured",
  ISFEATURED: "isFeatured",
  FEATURED: "isFeatured",
  // Beneficios
  BENEFICIOS: "highlights",
  "POR QUE COMPRARLO": "highlights",
  "¿POR QUÉ COMPRARLO?": "highlights",
  HIGHLIGHTS: "highlights",
  // FAQs
  FAQS: "faqs",
  FAQ: "faqs",
  "PREGUNTAS FRECUENTES": "faqs",
  // SEO
  "TITULO SEO": "metaTitle",
  "TÍTULO SEO": "metaTitle",
  METATITLE: "metaTitle",
  "META TITLE": "metaTitle",
  "DESCRIPCION SEO": "metaDescription",
  "DESCRIPCIÓN SEO": "metaDescription",
  METADESCRIPTION: "metaDescription",
  "META DESCRIPTION": "metaDescription",
}

export function matchHeader(rawHeader: unknown): string | null {
  const trimmed = String(rawHeader ?? "").trim()
  if (!trimmed) return null

  const lowerKey = trimmed.toLowerCase()
  if (DANGEROUS_KEYS.has(lowerKey) || DANGEROUS_KEYS.has(trimmed)) {
    return null
  }

  const upper = trimmed.toUpperCase()
  if (Object.prototype.hasOwnProperty.call(COLUMN_HEADER_ALIASES, upper)) {
    return COLUMN_HEADER_ALIASES[upper]
  }
  const norm = normalizeKey(trimmed).toUpperCase()
  if (Object.prototype.hasOwnProperty.call(COLUMN_HEADER_ALIASES, norm)) {
    return COLUMN_HEADER_ALIASES[norm]
  }

  const directMap: Record<string, string> = {
    sku: "sku",
    name: "name",
    brandname: "brandName",
    categoryname: "categoryName",
    gender: "gender",
    price: "price",
    isonsale: "isOnSale",
    saleprice: "salePrice",
    description: "description",
    extendeddescription: "extendedDescription",
    size: "size",
    sizeus: "sizeUS",
    sizecm: "sizeCM",
    sizeeur: "sizeEUR",
    color: "color",
    stock: "stock",
    image1: "image1",
    image2: "image2",
    image3: "image3",
    image4: "image4",
    image5: "image5",
    image6: "image6",
    image7: "image7",
    image8: "image8",
    videourl: "videoUrl",
    photosfolderurl: "photosFolderUrl",
    readyflag: "readyFlag",
    colorgroup: "colorGroup",
    ispublished: "isPublished",
    availableonline: "availableOnline",
    availableinstores: "availableInStores",
    isfeatured: "isFeatured",
    islaunch: "isLaunch",
    highlights: "highlights",
    faqs: "faqs",
  }
  if (Object.prototype.hasOwnProperty.call(directMap, lowerKey)) {
    return directMap[lowerKey]
  }
  return null
}

export interface ProductImportRowResult {
  rowNumber: number
  sku: string
  productName: string
  action: "create_product" | "add_variant" | "update_variant" | "error" | "skip"
  message: string
  variantCount?: number
  warnings?: string[]
}

export interface ProductImportSummary {
  newProducts: number
  newVariants: number
  updatedVariants: number
  errors: number
  skipped?: number
  deactivatedProducts?: number
}

export interface ProductImportProductSummary {
  productId?: string
  productName: string
  baseSku?: string
  isExisting: boolean
  priceBefore: number | null
  priceAfter: number
  stockBefore: number | null
  stockAfter: number
  addedSizesCount: number
  updatedVariantsCount: number
  isDeactivated?: boolean
}

export interface ProductImportPreview {
  fingerprint: string
  rows: ProductImportRowResult[]
  products: ProductImportProductSummary[]
  summary: ProductImportSummary
  hasReadyColumn: boolean
}

export type TextUpdateMode = "fill_empty" | "overwrite"

export interface ProductImportOptions {
  onlyReadyRows?: boolean
  textUpdateMode?: TextUpdateMode
}

export interface PlannedVariant {
  row: ProductImportRow
  rowNumber: number
  kind: "create" | "update"
  existingVariantId?: string
  isRecoveredFromDate?: boolean
}

export interface PlannedGroup {
  groupKey: string
  name: string
  brandName: string
  categoryName: string
  baseSku?: string
  colorGroup?: string
  existingProductId: string | null
  variants: PlannedVariant[]
}

interface ParsedRawRow {
  rowNumber: number
  rowObj: Record<string, unknown>
  rawSizeCell: unknown
  cellMetaForSize?: { z?: string; t?: string }
}

function parseWorkbook(buffer: ArrayBuffer): {
  rows: ParsedRawRow[]
  hasReadyColumn: boolean
} {
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `El archivo excede el tamaño máximo permitido de ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB.`
    )
  }

  const bytes = new Uint8Array(buffer)
  validateZipSafety(bytes)

  const maxReadRows = MAX_SHEET_ROWS + 50
  const wb = XLSX.read(bytes, {
    type: "array",
    cellDates: true,
    cellNF: true,
    sheets: 0,
    sheetRows: maxReadRows,
  })

  const sheetName = wb.SheetNames[0]
  if (!sheetName) {
    throw new Error("El archivo no contiene ninguna hoja de cálculo.")
  }
  const sheet = wb.Sheets[sheetName]
  if (!sheet) {
    throw new Error("No se pudo leer la primera hoja del archivo Excel.")
  }

  if (sheet["!ref"]) {
    const range = XLSX.utils.decode_range(sheet["!ref"])
    if (range.e.c + 1 > MAX_COLUMNS) {
      throw new Error(
        `El archivo excede el límite máximo de ${MAX_COLUMNS} columnas permitidas (se detectaron ${range.e.c + 1} columnas).`
      )
    }
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false })

  if (!matrix || matrix.length === 0) {
    return { rows: [], hasReadyColumn: false }
  }

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r]
    if (!Array.isArray(row)) continue

    if (row.length > MAX_COLUMNS) {
      throw new Error(
        `El archivo excede el límite máximo de ${MAX_COLUMNS} columnas permitidas (la fila ${r + 1} tiene ${row.length} columnas).`
      )
    }

    for (let c = 0; c < row.length; c++) {
      const cellValue = String(row[c] ?? "")
      if (cellValue.length > MAX_CELL_LENGTH) {
        throw new Error(
          `La celda en la fila ${r + 1}, columna ${c + 1} excede el límite máximo de ${MAX_CELL_LENGTH.toLocaleString("es-CO")} caracteres.`
        )
      }
    }
  }

  // 1. Detectar la fila de encabezados: primera fila con columna "SKU"
  let headerRowIndex = -1
  const colMap = new Map<number, string>()
  let sizeColIdx = -1
  let hasReadyColumn = false

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r]
    if (!Array.isArray(row)) continue
    for (let c = 0; c < row.length; c++) {
      const field = matchHeader(row[c])
      if (field === "sku") {
        headerRowIndex = r
        break
      }
    }
    if (headerRowIndex !== -1) {
      // Mapear todas las columnas de esta fila
      for (let c = 0; c < row.length; c++) {
        const field = matchHeader(row[c])
        if (field && !DANGEROUS_KEYS.has(field.toLowerCase())) {
          colMap.set(c, field)
          if (field === "size") sizeColIdx = c
          if (field === "readyFlag") hasReadyColumn = true
        }
      }
      break
    }
  }

  if (headerRowIndex === -1) {
    throw new Error("No se encontró la fila de encabezados con columna SKU en el archivo.")
  }

  // 2. Extraer datos a partir de la siguiente fila
  const parsedRows: ParsedRawRow[] = []

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const rawRow = matrix[r]
    if (!Array.isArray(rawRow) || rawRow.every((cell) => cell === undefined || cell === null || String(cell).trim() === "")) {
      continue
    }

    const rowObj: Record<string, unknown> = Object.create(null)
    colMap.forEach((fieldKey, colIdx) => {
      if (DANGEROUS_KEYS.has(fieldKey.toLowerCase())) return
      rowObj[fieldKey] = rawRow[colIdx] ?? ""
    })

    const hasSomeData = Object.values(rowObj).some(
      (val) => val !== undefined && val !== null && String(val).trim().length > 0
    )
    if (!hasSomeData) continue

    const rawSku = String(rowObj.sku ?? "").trim()
    const lowerSku = rawSku.toLowerCase()

    // Descartar filas que sean notas evidentes
    const isObviousNote =
      lowerSku === "nota" ||
      lowerSku.startsWith("codigo unico") ||
      lowerSku.startsWith("código único")

    if (isObviousNote) {
      continue
    }

    // Si no tiene SKU y tampoco tiene nombre ni precio, se ignora como fila vacía / nota
    const hasCoreProductData = Boolean(
      (rowObj.name && String(rowObj.name).trim().length > 0) ||
      (rowObj.price !== undefined && rowObj.price !== null && String(rowObj.price).trim().length > 0)
    )
    if (!rawSku && !hasCoreProductData) {
      continue
    }

    // Inspeccionar la celda de talla original en la hoja
    let rawSizeCell = rowObj.size
    let cellMetaForSize: { z?: string; t?: string } | undefined
    if (sizeColIdx !== -1) {
      const cellAddress = XLSX.utils.encode_cell({ r, c: sizeColIdx })
      const sheetCell = sheet ? sheet[cellAddress] : undefined
      if (sheetCell) {
        rawSizeCell = sheetCell.v ?? rowObj.size
        cellMetaForSize = { z: sheetCell.z, t: sheetCell.t }
      }
    }

    parsedRows.push({
      rowNumber: r + 1, // 1-indexed para el usuario
      rowObj,
      rawSizeCell,
      cellMetaForSize,
    })
  }

  if (matrix.length >= maxReadRows || parsedRows.length > MAX_SHEET_ROWS) {
    throw new Error(
      `El archivo excede el límite máximo de ${MAX_SHEET_ROWS.toLocaleString("es-CO")} filas de datos permitidas (se encontraron ${parsedRows.length.toLocaleString("es-CO")}).`
    )
  }

  return { rows: parsedRows, hasReadyColumn }
}

/**
 * Parsea y planea la importación:
 * - Detecta encabezados por nombre
 * - Filtra marcas omitidas ("BOLSAS DE VENTA", etc.)
 * - Soporta PRODUCTO LISTO (importar solo filas OK)
 * - Valida tallas (soporta fechas convertidas, medias tallas, sufijos I/J/B, U, Única)
 * - Agrupa por talla cuando el SKU se repite en varias filas (${sku}_${size})
 * - Detecta duplicados reales indicando ambas filas
 * - Agrupa por producto
 */
async function planImport(
  buffer: ArrayBuffer,
  options?: ProductImportOptions
): Promise<{
  rowResults: ProductImportRowResult[]
  groups: PlannedGroup[]
  productsSummary: ProductImportProductSummary[]
  fingerprint: string
  hasReadyColumn: boolean
  existingProductsMap: Map<string, ProductForImport>
  productsToDeactivateIds: string[]
}> {
  const { rows: rawRows, hasReadyColumn } = parseWorkbook(buffer)
  const onlyReady = options?.onlyReadyRows ?? (hasReadyColumn ? true : false)

  const rowResults: ProductImportRowResult[] = []

  interface ValidCandidate {
    row: ProductImportRow
    rowNumber: number
    rawSku: string
    isRecoveredFromDate: boolean
  }

  interface NotReadyCandidate {
    rawSku: string
    baseSku: string
  }

  const validCandidates: ValidCandidate[] = []
  const notReadyCandidates: NotReadyCandidate[] = []

  for (const { rowNumber, rowObj, rawSizeCell, cellMetaForSize } of rawRows) {
    const rawSku = String(rowObj.sku ?? "").trim()
    const rawName = String(rowObj.name ?? "").trim()
    const rawBrand = String(rowObj.brandName ?? "").trim()

    // 1. Marcas a ignorar sin error
    if (isSkippedBrand(rawBrand)) {
      rowResults.push({
        rowNumber,
        sku: rawSku,
        productName: rawName,
        action: "skip",
        message: `Fila omitida: marca "${rawBrand}" no catalogable`,
      })
      continue
    }

    // 2. PRODUCTO LISTO: filtrar si está activa la opción
    if (hasReadyColumn && onlyReady) {
      const readyVal = String(rowObj.readyFlag ?? "").trim().toUpperCase()
      const isReady = ["OK", "SI", "SÍ", "TRUE", "1", "LISTO"].includes(readyVal)
      if (!isReady) {
        rowResults.push({
          rowNumber,
          sku: rawSku,
          productName: rawName,
          action: "skip",
          message: "Fila omitida (no lista)",
        })
        if (rawSku) {
          notReadyCandidates.push({
            rawSku,
            baseSku: parseSku(rawSku).baseSku.trim(),
          })
        }
        continue
      }
    }

    // 3. Alias de marca
    if (rawBrand) {
      rowObj.brandName = resolveBrandAlias(rawBrand)
    }

    // 4. Validación y normalización de talla
    const sizeResult = validateAndNormalizeSize(rawSizeCell, cellMetaForSize)
    if (!sizeResult.valid) {
      rowResults.push({
        rowNumber,
        sku: rawSku,
        productName: rawName,
        action: "error",
        message: sizeResult.error ?? "Talla inválida",
      })
      continue
    }
    rowObj.size = sizeResult.size!
    const isRecoveredFromDate = sizeResult.recoveredFromDate ?? false

    // 5. Validación de esquema de la fila
    const parsed = productImportRowSchema.safeParse(rowObj)
    if (!parsed.success) {
      rowResults.push({
        rowNumber,
        sku: rawSku,
        productName: rawName,
        action: "error",
        message: parsed.error.issues[0]?.message ?? "Fila inválida",
      })
      continue
    }

    validCandidates.push({
      row: parsed.data,
      rowNumber,
      rawSku,
      isRecoveredFromDate,
    })
  }

  // 6. Contar apariciones de cada SKU base entre candidatos válidos
  const rawSkuCounts = new Map<string, number>()
  for (const c of validCandidates) {
    rawSkuCounts.set(c.rawSku, (rawSkuCounts.get(c.rawSku) ?? 0) + 1)
  }

  // 7. Resolver SKU de variante y detectar duplicados reales (mismo SKU + misma talla)
  interface PreparedRow {
    row: ProductImportRow
    rowNumber: number
    isRecoveredFromDate: boolean
  }

  const preparedRows: PreparedRow[] = []
  const seenSkuSizes = new Map<string, number>()

  for (const c of validCandidates) {
    const rawSku = c.rawSku
    const size = c.row.size
    const appearsMultipleTimes = (rawSkuCounts.get(rawSku) ?? 0) > 1

    // Si el SKU ya trae "_" o es único en el archivo, se respeta tal cual.
    // Si aparece en varias filas con tallas distintas, se genera `${rawSku}_${size}`
    const finalVariantSku = rawSku.includes("_")
      ? rawSku
      : appearsMultipleTimes
        ? `${rawSku}_${size}`
        : rawSku

    // Clave de duplicado: mismo SKU base + misma talla
    const dupKey = `${rawSku.toUpperCase()}|${size}`
    if (seenSkuSizes.has(dupKey)) {
      const firstRowNumber = seenSkuSizes.get(dupKey)!
      rowResults.push({
        rowNumber: c.rowNumber,
        sku: finalVariantSku,
        productName: c.row.name,
        action: "error",
        message: `SKU y talla duplicados en el archivo (filas ${firstRowNumber} y ${c.rowNumber})`,
      })
      continue
    }

    seenSkuSizes.set(dupKey, c.rowNumber)
    preparedRows.push({
      row: { ...c.row, sku: finalVariantSku },
      rowNumber: c.rowNumber,
      isRecoveredFromDate: c.isRecoveredFromDate,
    })
  }

  // 8. Consultar variantes y productos existentes en la BD para planear create/update y verificar ERP
  const skus = preparedRows.map((r) => r.row.sku)
  const baseSkus = [
    ...new Set(preparedRows.map((r) => parseSku(r.row.sku).baseSku.trim()).filter(Boolean)),
  ]

  const notReadySkus = [...new Set(notReadyCandidates.map((c) => c.rawSku).filter(Boolean))]
  const notReadyBaseSkus = [
    ...new Set(notReadyCandidates.map((c) => c.baseSku).filter(Boolean)),
  ]

  const isErpOwner = await isErpCatalogOwner()

  const [
    existingVariants,
    productsByBase,
    notReadyExistingVariants,
    notReadyProductsByBase,
    categories,
    brands,
  ] = await Promise.all([
    findVariantsBySkus(skus),
    findProductsByBaseSkus(baseSkus),
    hasReadyColumn && onlyReady && notReadySkus.length > 0 ? findVariantsBySkus(notReadySkus) : Promise.resolve([]),
    hasReadyColumn && onlyReady && notReadyBaseSkus.length > 0 ? findProductsByBaseSkus(notReadyBaseSkus) : Promise.resolve([]),
    findManyCategories(),
    findManyBrands(),
  ])

  const existingProductsMap = new Map<string, ProductForImport>()
  for (const p of productsByBase) {
    existingProductsMap.set(p.id, p)
  }

  // Si alguna variante coincide por SKU exacto pero su producto no fue retornado por baseSku, lo buscamos
  const missingProductIds = [
    ...new Set(
      existingVariants.map((v) => v.product.id).filter((id) => !existingProductsMap.has(id))
    ),
  ]
  if (missingProductIds.length > 0) {
    const missingProducts = await findProductsByIdsForImport(missingProductIds)
    for (const p of missingProducts) {
      existingProductsMap.set(p.id, p)
    }
  }

  // Índice de productos por slug en minúsculas (el slug de los productos ERP es el SKU base)
  const productBySlug = new Map<string, ProductForImport>()
  for (const p of existingProductsMap.values()) {
    productBySlug.set(p.slug.toLowerCase(), p)
  }

  // Índice de variantes existentes por SKU exacto -> { product, variant }
  const variantByExactSku = new Map<
    string,
    { product: ProductForImport; variant: ProductForImport["variants"][number] }
  >()
  for (const p of existingProductsMap.values()) {
    for (const v of p.variants) {
      variantByExactSku.set(v.sku, { product: p, variant: v })
    }
  }

  const groups = new Map<string, PlannedGroup>()
  const matchedVariantIds = new Set<string>()

  for (const { row, rowNumber, isRecoveredFromDate } of preparedRows) {
    const rowBaseSku = parseSku(row.sku).baseSku.trim()
    const rowNormSize = normalizeVariantSize(row.size)

    // Identificar producto existente sin duplicados:
    // 1. Coincidencia exacta por SKU de variante
    // 2. Coincidencia de baseSku con slug del producto (los productos ERP tienen el SKU base como slug)
    // 3. Coincidencia de variante existente con mismo baseSku y talla normalizada
    let existingProduct: ProductForImport | null = null
    const exactVar = variantByExactSku.get(row.sku)
    if (exactVar) {
      existingProduct = exactVar.product
    } else if (rowBaseSku && productBySlug.has(rowBaseSku.toLowerCase())) {
      existingProduct = productBySlug.get(rowBaseSku.toLowerCase())!
    } else if (rowBaseSku) {
      for (const p of existingProductsMap.values()) {
        const found = p.variants.some(
          (v) =>
            parseSku(v.sku).baseSku.toLowerCase() === rowBaseSku.toLowerCase() &&
            normalizeVariantSize(v.size) === rowNormSize
        )
        if (found) {
          existingProduct = p
          break
        }
      }
    }

    // El rechazo "Gestionado por ERP" solo aplica si el ERP es dueño del catálogo (isErpCatalogOwner() === true)
    if (existingProduct && existingProduct.erpId !== null && isErpOwner) {
      rowResults.push({
        rowNumber,
        sku: row.sku,
        productName: row.name,
        action: "error",
        message: `Gestionado por ERP (producto "${existingProduct.name}") — no se puede modificar aquí`,
      })
      continue
    }

    // Cruce de variantes dentro del producto:
    // 1. Por SKU exacto
    // 2. Si no hay coincidencia, por (SKU base + talla normalizada)
    let matchedVariant: ProductForImport["variants"][number] | null = null
    if (existingProduct) {
      const byExact = existingProduct.variants.find(
        (v) => v.sku === row.sku && !matchedVariantIds.has(v.id)
      )
      if (byExact) {
        matchedVariant = byExact
      } else if (rowBaseSku) {
        const byBaseAndSize = existingProduct.variants.find(
          (v) =>
            !matchedVariantIds.has(v.id) &&
            parseSku(v.sku).baseSku.toLowerCase() === rowBaseSku.toLowerCase() &&
            normalizeVariantSize(v.size) === rowNormSize
        )
        if (byBaseAndSize) {
          matchedVariant = byBaseAndSize
        }
      }
      if (matchedVariant) {
        matchedVariantIds.add(matchedVariant.id)
      }
    }

    // Agrupación para evitar duplicar productos:
    // Si existe el producto en BD, se agrupan en su ID.
    // Si es nuevo, se agrupan por baseSku (o por nombre+marca+categoría si no tiene SKU base).
    const groupKey = existingProduct
      ? `prod:${existingProduct.id}`
      : `new:${rowBaseSku ? rowBaseSku.toLowerCase() : [row.name, row.brandName, row.categoryName].map(normalizeKey).join("|")}`

    let group = groups.get(groupKey)
    if (!group) {
      group = {
        groupKey,
        name: row.name,
        brandName: row.brandName,
        categoryName: row.categoryName,
        baseSku: rowBaseSku || undefined,
        colorGroup: row.colorGroup?.trim() || undefined,
        existingProductId: existingProduct ? existingProduct.id : null,
        variants: [],
      }
      groups.set(groupKey, group)
    } else if (!group.colorGroup && row.colorGroup?.trim()) {
      group.colorGroup = row.colorGroup.trim()
    }

    const plannedVariant: PlannedVariant = matchedVariant
      ? { row, rowNumber, kind: "update", existingVariantId: matchedVariant.id, isRecoveredFromDate }
      : { row, rowNumber, kind: "create", isRecoveredFromDate }
    group.variants.push(plannedVariant)
  }

  // 9. Asignar acciones, conteo de variantes y mensajes detallados
  for (const group of groups.values()) {
    let productAlreadyPlanned = group.existingProductId !== null
    const totalVariants = group.variants.length
    const hasImages = group.variants.some((v) =>
      Boolean(
        v.row.image1 ||
        v.row.image2 ||
        v.row.image3 ||
        v.row.image4 ||
        v.row.image5 ||
        v.row.image6 ||
        v.row.image7 ||
        v.row.image8
      )
    )

    for (const v of group.variants) {
      const action =
        v.kind === "update"
          ? "update_variant"
          : productAlreadyPlanned
            ? "add_variant"
            : "create_product"

      const warnings: string[] = []
      if (v.isRecoveredFromDate) warnings.push("talla recuperada de fecha")
      if (!hasImages) warnings.push("sin fotos")
      if (v.row.metaTitle && v.row.metaTitle.length > 60) {
        warnings.push("Título SEO excede los 60 caracteres recomendados")
      }
      if (v.row.metaDescription && v.row.metaDescription.length > 160) {
        warnings.push("Descripción SEO excede los 160 caracteres recomendados")
      }

      let msg = ""
      if (v.kind === "update") {
        msg = "Se actualiza talla/color/stock de la variante existente"
      } else if (productAlreadyPlanned) {
        msg = "Se agrega como variante nueva del producto existente"
      } else {
        msg = `Se crea como producto nuevo (${totalVariants} variante(s) generadas)`
      }
      if (warnings.length > 0) {
        msg += ` (${warnings.join(", ")})`
      }

      rowResults.push({
        rowNumber: v.rowNumber,
        sku: v.row.sku,
        productName: v.row.name,
        action,
        message: msg,
        variantCount: totalVariants,
        warnings,
      })

      if (v.kind === "create") productAlreadyPlanned = true
    }
  }

  // 10. Resumen por producto (precio y stock antes → después, y cuántas tallas se agregan)
  const productsSummary: ProductImportProductSummary[] = []
  for (const group of groups.values()) {
    const firstRow = group.variants[0]?.row
    if (!firstRow) continue

    if (group.existingProductId && existingProductsMap.has(group.existingProductId)) {
      const existingProduct = existingProductsMap.get(group.existingProductId)!
      const priceBefore = existingProduct.basePrice != null ? Number(existingProduct.basePrice) : null
      const priceAfter = firstRow.price
      const stockBefore = existingProduct.variants.reduce((sum, v) => sum + (v.stock || 0), 0)

      const updatedVariantIds = new Set(
        group.variants.filter((v) => v.kind === "update").map((v) => v.existingVariantId)
      )
      const unmentionedStock = existingProduct.variants
        .filter((v) => !updatedVariantIds.has(v.id))
        .reduce((sum, v) => sum + (v.stock || 0), 0)
      const importStock = group.variants.reduce((sum, v) => sum + (v.row.stock || 0), 0)
      const stockAfter = unmentionedStock + importStock

      const addedSizesCount = group.variants.filter((v) => v.kind === "create").length
      const updatedVariantsCount = group.variants.filter((v) => v.kind === "update").length

      productsSummary.push({
        productId: existingProduct.id,
        productName: existingProduct.name,
        baseSku: group.baseSku,
        isExisting: true,
        priceBefore,
        priceAfter,
        stockBefore,
        stockAfter,
        addedSizesCount,
        updatedVariantsCount,
      })
    } else {
      const priceBefore = null
      const priceAfter = firstRow.price
      const stockBefore = null
      const stockAfter = group.variants.reduce((sum, v) => sum + (v.row.stock || 0), 0)
      const addedSizesCount = group.variants.length
      const updatedVariantsCount = 0

      productsSummary.push({
        productName: group.name,
        baseSku: group.baseSku,
        isExisting: false,
        priceBefore,
        priceAfter,
        stockBefore,
        stockAfter,
        addedSizesCount,
        updatedVariantsCount,
      })
    }
  }

  // 10b. Desactivación de productos existentes que en el archivo NO están marcados como listos
  const plannedExistingProductIds = new Set(
    [...groups.values()].map((g) => g.existingProductId).filter(Boolean) as string[]
  )

  const candidateDeactivateIds = new Set<string>()
  for (const p of notReadyProductsByBase) {
    if (!plannedExistingProductIds.has(p.id)) {
      candidateDeactivateIds.add(p.id)
    }
  }
  for (const v of notReadyExistingVariants) {
    if (!plannedExistingProductIds.has(v.product.id)) {
      candidateDeactivateIds.add(v.product.id)
    }
  }

  const productsToDeactivateIds = [...candidateDeactivateIds]
  if (productsToDeactivateIds.length > 0) {
    const missingDeactivateIds = productsToDeactivateIds.filter((id) => !existingProductsMap.has(id))
    if (missingDeactivateIds.length > 0) {
      const fetched = await findProductsByIdsForImport(missingDeactivateIds)
      for (const p of fetched) {
        existingProductsMap.set(p.id, p)
      }
    }

    for (const id of productsToDeactivateIds) {
      const p = existingProductsMap.get(id)
      if (!p) continue
      const totalStock = p.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
      const price = p.basePrice != null ? Number(p.basePrice) : 0
      productsSummary.push({
        productId: p.id,
        productName: p.name,
        baseSku: parseSku(p.variants[0]?.sku ?? p.slug).baseSku || p.slug,
        isExisting: true,
        priceBefore: price,
        priceAfter: price,
        stockBefore: totalStock,
        stockAfter: totalStock,
        addedSizesCount: 0,
        updatedVariantsCount: 0,
        isDeactivated: true,
      })
    }
  }

  // 11. Huella digital del catálogo
  const categoryNames = categories.map((c) => normalizeKey(c.name)).sort()
  const brandNames = brands.map((b) => normalizeKey(b.name)).sort()
  const fingerprintPayload = {
    variants: Array.from(existingProductsMap.values())
      .flatMap((p) => p.variants)
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        stock: v.stock,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    deactivatedProductIds: productsToDeactivateIds.slice().sort(),
    categoryNames,
    brandNames,
    onlyReady,
  }
  const fingerprint = crypto
    .createHash("sha256")
    .update(JSON.stringify(fingerprintPayload))
    .digest("hex")

  return {
    rowResults,
    groups: [...groups.values()],
    productsSummary,
    fingerprint,
    hasReadyColumn,
    existingProductsMap,
    productsToDeactivateIds,
  }
}

export async function previewProductImport(
  buffer: ArrayBuffer,
  options?: ProductImportOptions
): Promise<ProductImportPreview> {
  const { rowResults, productsSummary, fingerprint, hasReadyColumn, productsToDeactivateIds } =
    await planImport(buffer, options)
  const rawSummary = rowResults.reduce(
    (acc, r) => {
      if (r.action === "create_product") acc.newProducts++
      else if (r.action === "add_variant") acc.newVariants++
      else if (r.action === "update_variant") acc.updatedVariants++
      else if (r.action === "error") acc.errors++
      else if (r.action === "skip") acc.skipped++
      return acc
    },
    { newProducts: 0, newVariants: 0, updatedVariants: 0, errors: 0, skipped: 0 }
  )
  const summary: ProductImportSummary = {
    newProducts: rawSummary.newProducts,
    newVariants: rawSummary.newVariants,
    updatedVariants: rawSummary.updatedVariants,
    errors: rawSummary.errors,
    ...(rawSummary.skipped > 0 ? { skipped: rawSummary.skipped } : {}),
    ...(productsToDeactivateIds.length > 0 ? { deactivatedProducts: productsToDeactivateIds.length } : {}),
  }
  return {
    fingerprint,
    rows: rowResults.sort((a, b) => a.rowNumber - b.rowNumber),
    products: productsSummary,
    summary,
    hasReadyColumn,
  }
}

export interface ProductImportApplyResult {
  newProducts: number
  newVariants: number
  updatedVariants: number
  deactivatedProducts?: number
}

export async function applyProductImport(
  buffer: ArrayBuffer,
  expectedFingerprint: string,
  options?: ProductImportOptions
): Promise<ProductImportApplyResult> {
  const { groups, fingerprint, existingProductsMap, productsToDeactivateIds } = await planImport(buffer, options)
  if (fingerprint !== expectedFingerprint) {
    throw new Error(
      "El catálogo cambió desde que generaste la vista previa. Vuelve a subir el archivo para revisar los cambios."
    )
  }

  const [categories, brands] = await Promise.all([findManyCategories(), findManyBrands()])
  return persistProductImport(
    groups,
    existingProductsMap,
    categories.map(({ id, name }) => ({ id, name })),
    brands.map(({ id, name }) => ({ id, name })),
    options?.textUpdateMode === "overwrite",
    productsToDeactivateIds,
  )
}
