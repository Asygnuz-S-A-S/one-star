import "server-only"

import crypto from "node:crypto"
import * as XLSX from "xlsx"
import type { Gender, Prisma } from "@prisma/client"

import { slugify } from "@/lib/utils"
import { prisma } from "@/server/db/prisma"
import { findManyCategories } from "@/server/repositories/category.repository"
import { findManyBrands } from "@/server/repositories/brand.repository"
import { findVariantsBySkus } from "@/server/repositories/product.repository"
import {
  isSkippedBrand,
  normalizeKey,
  productImportRowSchema,
  resolveBrandAlias,
  validateAndNormalizeSize,
  type ProductImportRow,
} from "@/server/validators/product-import.validator"

type TxClient = Prisma.TransactionClient

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
}

export function matchHeader(rawHeader: unknown): string | null {
  const trimmed = String(rawHeader ?? "").trim()
  if (!trimmed) return null
  const upper = trimmed.toUpperCase()
  if (COLUMN_HEADER_ALIASES[upper]) return COLUMN_HEADER_ALIASES[upper]
  const norm = normalizeKey(trimmed).toUpperCase()
  if (COLUMN_HEADER_ALIASES[norm]) return COLUMN_HEADER_ALIASES[norm]

  const lowerKey = trimmed.toLowerCase()
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
    ispublished: "isPublished",
    availableonline: "availableOnline",
    availableinstores: "availableInStores",
  }
  return directMap[lowerKey] ?? null
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
}

export interface ProductImportPreview {
  fingerprint: string
  rows: ProductImportRowResult[]
  summary: ProductImportSummary
  hasReadyColumn: boolean
}

export interface ProductImportOptions {
  onlyReadyRows?: boolean
}

interface PlannedVariant {
  row: ProductImportRow
  rowNumber: number
  kind: "create" | "update"
  existingVariantId?: string
  isRecoveredFromDate?: boolean
}

interface PlannedGroup {
  groupKey: string
  name: string
  brandName: string
  categoryName: string
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
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true, cellNF: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false })

  if (!matrix || matrix.length === 0) {
    return { rows: [], hasReadyColumn: false }
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
        if (field) {
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

    const rowObj: Record<string, unknown> = {}
    colMap.forEach((fieldKey, colIdx) => {
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
  fingerprint: string
  hasReadyColumn: boolean
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

  const validCandidates: ValidCandidate[] = []

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

  // 8. Consultar variantes existentes en la BD para planear create/update y verificar ERP
  const skus = preparedRows.map((r) => r.row.sku)
  const [existingVariants, categories, brands] = await Promise.all([
    findVariantsBySkus(skus),
    findManyCategories(),
    findManyBrands(),
  ])
  const existingBySku = new Map(existingVariants.map((v) => [v.sku, v]))

  const groups = new Map<string, PlannedGroup>()

  for (const { row, rowNumber, isRecoveredFromDate } of preparedRows) {
    const existing = existingBySku.get(row.sku)
    if (existing && existing.product.erpId !== null) {
      rowResults.push({
        rowNumber,
        sku: row.sku,
        productName: row.name,
        action: "error",
        message: `Gestionado por ERP (producto "${existing.product.name}") — no se puede modificar aquí`,
      })
      continue
    }

    const groupKey = [row.name, row.brandName, row.categoryName].map(normalizeKey).join("|")
    let group = groups.get(groupKey)
    if (!group) {
      group = {
        groupKey,
        name: row.name,
        brandName: row.brandName,
        categoryName: row.categoryName,
        existingProductId: existing ? existing.product.id : null,
        variants: [],
      }
      groups.set(groupKey, group)
    } else if (existing && group.existingProductId && existing.product.id !== group.existingProductId) {
      rowResults.push({
        rowNumber,
        sku: row.sku,
        productName: row.name,
        action: "error",
        message: "Este grupo de filas apunta a más de un producto existente distinto — revisa el SKU",
      })
      continue
    } else if (existing && !group.existingProductId) {
      group.existingProductId = existing.product.id
    }

    const plannedVariant: PlannedVariant = existing
      ? { row, rowNumber, kind: "update", existingVariantId: existing.id, isRecoveredFromDate }
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

  // 10. Huella digital del catálogo
  const categoryNames = categories.map((c) => normalizeKey(c.name)).sort()
  const brandNames = brands.map((b) => normalizeKey(b.name)).sort()
  const fingerprintPayload = {
    variants: existingVariants
      .map((v) => ({
        sku: v.sku,
        productId: v.product.id,
        erpId: v.product.erpId,
        size: v.size,
        color: v.color,
        stock: v.stock,
      }))
      .sort((a, b) => a.sku.localeCompare(b.sku)),
    categoryNames,
    brandNames,
    onlyReady,
  }
  const fingerprint = crypto
    .createHash("sha256")
    .update(JSON.stringify(fingerprintPayload))
    .digest("hex")

  return { rowResults, groups: [...groups.values()], fingerprint, hasReadyColumn }
}

export async function previewProductImport(
  buffer: ArrayBuffer,
  options?: ProductImportOptions
): Promise<ProductImportPreview> {
  const { rowResults, fingerprint, hasReadyColumn } = await planImport(buffer, options)
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
  }
  return {
    fingerprint,
    rows: rowResults.sort((a, b) => a.rowNumber - b.rowNumber),
    summary,
    hasReadyColumn,
  }
}

async function resolveCategoryId(
  tx: TxClient,
  name: string,
  existing: { id: string; name: string }[],
  cache: Map<string, string>
): Promise<string> {
  const key = normalizeKey(name)
  const cached = cache.get(key)
  if (cached) return cached
  const found = existing.find((c) => normalizeKey(c.name) === key)
  if (found) {
    cache.set(key, found.id)
    return found.id
  }
  const slug = slugify(name)
  const created = await tx.category.upsert({
    where: { slug },
    update: {},
    create: { slug, name, description: `Categoría creada al importar productos desde Excel: ${name}` },
  })
  cache.set(key, created.id)
  return created.id
}

async function resolveBrandId(
  tx: TxClient,
  name: string,
  existing: { id: string; name: string }[],
  cache: Map<string, string>
): Promise<string> {
  const canonicalName = resolveBrandAlias(name)
  const key = normalizeKey(canonicalName)
  const cached = cache.get(key)
  if (cached) return cached
  const found = existing.find((b) => normalizeKey(b.name) === key)
  if (found) {
    cache.set(key, found.id)
    return found.id
  }
  const slug = slugify(canonicalName)
  const created = await tx.brand.upsert({
    where: { slug },
    update: {},
    create: { slug, name: canonicalName },
  })
  cache.set(key, created.id)
  return created.id
}

async function uniqueSlug(tx: TxClient, base: string): Promise<string> {
  let candidate = base
  let suffix = 2
  while (await tx.product.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`
    suffix++
  }
  return candidate
}

export interface ProductImportApplyResult {
  newProducts: number
  newVariants: number
  updatedVariants: number
}

export async function applyProductImport(
  buffer: ArrayBuffer,
  expectedFingerprint: string,
  options?: ProductImportOptions
): Promise<ProductImportApplyResult> {
  const { groups, fingerprint } = await planImport(buffer, options)
  if (fingerprint !== expectedFingerprint) {
    throw new Error(
      "El catálogo cambió desde que generaste la vista previa. Vuelve a subir el archivo para revisar los cambios."
    )
  }

  const categories = await findManyCategories()
  const brands = await findManyBrands()
  const categoryCache = new Map<string, string>()
  const brandCache = new Map<string, string>()

  let newProducts = 0
  let newVariants = 0
  let updatedVariants = 0

  await prisma.$transaction(
    async (tx) => {
      for (const group of groups) {
        let productId = group.existingProductId

        if (!productId) {
          const categoryId = await resolveCategoryId(tx, group.categoryName, categories, categoryCache)
          const brandId = await resolveBrandId(tx, group.brandName, brands, brandCache)
          const first = group.variants.find((v) => v.kind === "create")!.row
          const slug = await uniqueSlug(tx, slugify(group.name))
          const images: Prisma.ProductImageCreateWithoutProductInput[] = []
          const seenUrls = new Set<string>()

          for (const v of group.variants) {
            const rowImages = [
              v.row.image1,
              v.row.image2,
              v.row.image3,
              v.row.image4,
              v.row.image5,
              v.row.image6,
              v.row.image7,
              v.row.image8,
            ]
            for (const url of rowImages) {
              if (url && !seenUrls.has(url)) {
                seenUrls.add(url)
                images.push({ url, alt: group.name, position: images.length, color: v.row.color })
              }
            }
          }

          // Si el producto no tiene fotos, se crea como no publicado (isPublished = false)
          const isPublished = images.length === 0 ? false : (first.isPublished ?? true)

          const created = await tx.product.create({
            data: {
              name: group.name,
              slug,
              basePrice: first.price,
              isOnSale: first.isOnSale ?? false,
              salePrice: first.isOnSale ? (first.salePrice ?? null) : null,
              description: first.description ?? null,
              extendedDescription: first.extendedDescription ?? null,
              videoUrl: first.videoUrl ?? null,
              photosFolderUrl: first.photosFolderUrl ?? null,
              gender: (first.gender as Gender | undefined) ?? null,
              category: { connect: { id: categoryId } },
              brand: { connect: { id: brandId } },
              isPublished,
              availableOnline: first.availableOnline ?? true,
              availableInStores: first.availableInStores ?? true,
              images: { create: images },
            },
          })
          productId = created.id
          newProducts++
        }

        if (group.existingProductId) {
          const current = await tx.productImage.findMany({
            where: { productId: group.existingProductId },
            select: { url: true },
          })
          const seen = new Set(current.map((i) => i.url))
          let position = current.length
          const extra: Prisma.ProductImageCreateManyInput[] = []
          for (const v of group.variants) {
            if (v.kind !== "create") continue
            const rowImages = [
              v.row.image1,
              v.row.image2,
              v.row.image3,
              v.row.image4,
              v.row.image5,
              v.row.image6,
              v.row.image7,
              v.row.image8,
            ]
            for (const url of rowImages) {
              if (url && !seen.has(url)) {
                seen.add(url)
                extra.push({
                  productId: group.existingProductId,
                  url,
                  alt: group.name,
                  position: position++,
                  color: v.row.color,
                })
              }
            }
          }
          if (extra.length > 0) await tx.productImage.createMany({ data: extra })
        }

        for (const v of group.variants) {
          if (v.kind === "update" && v.existingVariantId) {
            await tx.variant.update({
              where: { id: v.existingVariantId },
              data: {
                size: v.row.size,
                color: v.row.color,
                stock: v.row.stock,
                sizeUS: v.row.sizeUS ?? null,
                sizeCM: v.row.sizeCM ?? null,
                sizeEUR: v.row.sizeEUR ?? null,
              },
            })
            updatedVariants++
          } else {
            await tx.variant.create({
              data: {
                productId,
                sku: v.row.sku,
                size: v.row.size,
                color: v.row.color,
                stock: v.row.stock,
                sizeUS: v.row.sizeUS ?? null,
                sizeCM: v.row.sizeCM ?? null,
                sizeEUR: v.row.sizeEUR ?? null,
              },
            })
            newVariants++
          }
        }
      }
    },
    { timeout: 120_000, maxWait: 10_000 }
  )

  return { newProducts, newVariants, updatedVariants }
}
