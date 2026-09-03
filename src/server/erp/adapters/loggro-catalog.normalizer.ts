import "server-only"

import type {
  ERPCatalogProductGroup,
  ERPCatalogSnapshot,
} from "../erp.types"
import { parseSku } from "@/lib/sku"
import type { LoggroCatalogItem } from "./loggro.client"
import { deriveLoggroColorFamilyKey } from "./loggro-color-family-key"
import { detectLoggroGender, hasLoggroGenderSignal } from "./loggro-gender"
import { detectLoggroCategory } from "./loggro-category"
import { detectLoggroBrand } from "./loggro-brand"
import { detectLoggroOnlineExclusion } from "./loggro-online-availability"

export interface LoggroStockSnapshot {
  stockByCodigo: Map<string, number>
  complete: boolean
  requestedCount: number
  resolvedCount: number
  missingCodes: string[]
  errors: string[]
}

function priceOf(item: LoggroCatalogItem): number | undefined {
  const rawPrice = [item.precioDefecto, item.precioBase, item.precioVta]
    .find((value) => value !== undefined && value !== null && value !== "")
  if (rawPrice === undefined) return undefined
  const price = Number(rawPrice)
  return Number.isFinite(price) ? price : undefined
}

function unitOfMeasureOf(item: LoggroCatalogItem): string | undefined {
  const unit = item.codigoUnidad || item.unidadMedida
  return unit ? String(unit) : undefined
}

export function normalizeLoggroCatalog(
  items: LoggroCatalogItem[],
  stock: LoggroStockSnapshot
): ERPCatalogSnapshot {
  const definitions = items.filter((item) => item.definicion === true)
  const variants = items.filter((item) => item.definicion !== true)
  const definitionsById = new Map(
    definitions
      .filter((item) => item.uuid)
      .map((item) => [String(item.uuid), item] as const)
  )
  const groupsById = new Map<string, ERPCatalogProductGroup>()
  const groupsWithDefinedPrice = new Set<string>()

  for (const item of variants) {
    const sku = String(item.codigo ?? item.uuid ?? "").trim()
    if (!sku) continue

    const parent = item.definidoEn_uuid
      ? definitionsById.get(String(item.definidoEn_uuid))
      : undefined
    const fallbackBaseSku = parseSku(sku).baseSku
    const groupId = String(
      parent?.uuid ?? item.definidoEn_uuid ?? `sku:${fallbackBaseSku}`
    )
    const groupSku = String(parent?.codigo ?? fallbackBaseSku).trim()
    const itemPrice = priceOf(item)

    let group = groupsById.get(groupId)
    if (!group) {
      const source = parent ?? item
      const sourcePrice = priceOf(source)
      group = {
        erpId: groupId,
        sku: groupSku,
        name: source.descripcion || "Sin Nombre",
        basePrice: sourcePrice ?? itemPrice ?? 0,
        unitOfMeasure: unitOfMeasureOf(source),
        categoryName:
          source.categoria || source.nombreCategoria || source.codigoCategoria || undefined,
        brandErpId: source.codigoCategoria || source.categoriaProducto_uuid || undefined,
        colorFamilyKey: deriveLoggroColorFamilyKey({
          brandCode: source.codigoCategoria,
          sku: groupSku,
        }),
        variants: [],
      }
      groupsById.set(groupId, group)
      if (sourcePrice !== undefined || itemPrice !== undefined) {
        groupsWithDefinedPrice.add(groupId)
      }
    } else if (!groupsWithDefinedPrice.has(groupId) && itemPrice !== undefined) {
      group.basePrice = itemPrice
      groupsWithDefinedPrice.add(groupId)
    }

    group.variants.push({
      erpId: String(item.uuid ?? item.codigo ?? ""),
      sku,
      name: item.descripcion || group.name,
      detailedName: item.descripcionDetallada || undefined,
      basePrice: itemPrice ?? group.basePrice,
      stock: stock.stockByCodigo.get(sku) ?? null,
      unitOfMeasure: unitOfMeasureOf(item),
    })
  }

  const normalizedGroups = [...groupsById.values()]
  for (const group of normalizedGroups) {
    group.onlineCatalogExclusionReason = detectLoggroOnlineExclusion({
      brandCode: group.brandErpId,
      name: group.name,
      basePrice: group.basePrice,
    })
    group.brandSuggestion = detectLoggroBrand(group.brandErpId, group.name)
    group.categorySuggestion = detectLoggroCategory(group.name)
    const parentGender = detectLoggroGender(group.name)
    if (parentGender) {
      group.gender = parentGender
      continue
    }
    if (hasLoggroGenderSignal(group.name)) {
      group.gender = undefined
      continue
    }

    const variantTexts = group.variants.map(
      (variant) => `${variant.name} ${variant.detailedName ?? ""}`
    )
    const variantResults = variantTexts.map((text) => ({
      gender: detectLoggroGender(text),
      hasSignal: hasLoggroGenderSignal(text),
    }))
    if (variantResults.some((result) => result.hasSignal && !result.gender)) {
      group.gender = undefined
      continue
    }
    const variantGenders = new Set(
      variantResults.flatMap((result) => result.gender ? [result.gender] : [])
    )
    group.gender = variantGenders.size === 1 ? [...variantGenders][0] : undefined
  }
  const normalizedVariants = normalizedGroups.flatMap((group) => group.variants)
  const totalStock = normalizedVariants.reduce(
    (total, variant) => total + (variant.stock ?? 0),
    0
  )
  const hasUnknownStock = normalizedVariants.some((variant) => variant.stock === null)
  const stockStatus = !stock.complete || hasUnknownStock
    ? "partial"
    : normalizedVariants.length > 0 && totalStock === 0
      ? "all_zero"
      : "complete"

  return {
    groups: normalizedGroups,
    diagnostics: {
      sourceItemCount: items.length,
      definitionCount: definitions.length,
      variantCount: variants.length,
      groupCount: groupsById.size,
    },
    stock: {
      complete: stock.complete,
      requestedCount: stock.requestedCount,
      resolvedCount: stock.resolvedCount,
      missingCodes: stock.missingCodes,
      errors: stock.errors,
      status: stockStatus,
      totalStock,
    },
  }
}
