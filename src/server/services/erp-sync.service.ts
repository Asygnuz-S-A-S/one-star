import "server-only"
import { getERPAdapter } from "@/server/erp"
import type { ErpSyncLog, ErpSyncTrigger } from "@prisma/client"
import type {
  ERPCatalogProductGroup,
  ERPCatalogSyncResult,
  ERPCatalogVariant,
  ERPEndpointDiagnostic,
  ERPEndpointDiagnostics,
} from "@/server/erp/erp.types"
import { sanitizeErpError } from "@/server/erp/erp-error"
import { parseSku, DEFAULT_SIZE } from "@/lib/sku"
import { detectColorFromText } from "@/lib/color-detect"
import { isRealColor } from "@/lib/colors"
import { findManyProductColors } from "@/server/repositories/product-color.repository"
import {
  createErpSyncLog,
  findRecentErpSyncLogs,
} from "@/server/repositories/erp-sync-log.repository"
import {
  countCatalogBrandsBySlug,
  createCatalogBrand,
  createCatalogProduct,
  createCatalogVariant,
  createDefaultImportCategory,
  ensureCatalogCategory,
  findCatalogBrandByErpId,
  findCatalogBrandBySlug,
  findCatalogProductBySlug,
  findDefaultImportCategory,
  fillMissingCatalogProductGenders,
  fillDefaultCatalogProductCategories,
  updateCatalogBrandErpId,
  updateCatalogProduct,
  updateCatalogVariant,
} from "@/server/repositories/erp-catalog.repository"
import { applyErpColorFamilyKeyUpdates } from "@/server/repositories/erp-color-family.repository"
import { getErpSyncSchedule } from "@/server/services/erp-sync-scheduler.service"
import type { ErpSyncInterval } from "@/lib/erp-sync-schedule"

export interface CatalogSyncOptions {
  /** Descarga y valida el catálogo, pero no escribe en PostgreSQL. */
  dryRun?: boolean
}

/** Máximo que esperamos por el healthcheck del ERP antes de darlo por caído. */
const PING_TIMEOUT_MS = 5000
/** Evita solapamientos entre cron y sincronización manual dentro del proceso. */
let catalogSyncInProgress = false

type WritableCatalogVariant = Omit<ERPCatalogVariant, "stock"> & { stock: number }
type WritableCatalogGroup = Omit<ERPCatalogProductGroup, "variants"> & {
  variants: WritableCatalogVariant[]
}

/**
 * Convierte el snapshot validado a su forma escribible. El cast está respaldado
 * por la comprobación exhaustiva de todos los stocks antes de tocar la BD.
 */
function getWritableGroups(groups: ERPCatalogProductGroup[]): WritableCatalogGroup[] | null {
  const hasUnknownStock = groups.some((group) =>
    group.variants.some((variant) => variant.stock === null)
  )
  return hasUnknownStock ? null : (groups as WritableCatalogGroup[])
}

function erpProviderName(): string {
  return (process.env.ERP_PROVIDER ?? "null").toLowerCase().trim()
}

function sanitizeCatalogSyncResult(result: ERPCatalogSyncResult): ERPCatalogSyncResult {
  return {
    ...result,
    error: result.error == null ? undefined : sanitizeErpError(result.error),
    warnings: result.warnings?.map(sanitizeErpError),
  }
}

/**
 * Sincroniza el catálogo desde el ERP y registra el resultado en la BD para
 * alimentar el panel de estado e historial de /admin/integraciones.
 *
 * @param trigger Quién disparó la sincronización (manual desde el panel o AUTO por cron).
 */
export async function syncCatalogFromERP(
  trigger: ErpSyncTrigger = "AUTO",
  options: CatalogSyncOptions = {}
): Promise<ERPCatalogSyncResult> {
  if (catalogSyncInProgress) {
    return {
      success: false,
      processedCount: 0,
      dryRun: options.dryRun ?? false,
      error: "ya hay una sincronización del catálogo en curso. Intenta nuevamente al finalizar.",
    }
  }

  catalogSyncInProgress = true
  try {
    const startedAt = Date.now()
    const result = sanitizeCatalogSyncResult(await runCatalogSync(options))

    if (!options.dryRun) {
      try {
        await createErpSyncLog({
          provider: erpProviderName(),
          trigger,
          success: result.success,
          processedCount: result.processedCount,
          error: result.error ?? null,
          durationMs: Date.now() - startedAt,
        })
      } catch (logErr) {
        console.error("[ERP Sync Service] No se pudo guardar el registro de sincronización:", logErr)
      }
    }

    return result
  } finally {
    catalogSyncInProgress = false
  }
}

/**
 * Sincroniza el catálogo de productos desde el ERP activo hacia la base de datos local.
 * Si el adaptador actual no soporta `fetchCatalog`, falla pacíficamente.
 */
async function runCatalogSync(options: CatalogSyncOptions): Promise<ERPCatalogSyncResult> {
  const adapter = getERPAdapter()

  if (!adapter.fetchCatalog) {
    return {
      success: false,
      processedCount: 0,
      error: "El ERP configurado no soporta la descarga completa del catálogo (fetchCatalog no implementado).",
    }
  }

  try {
    const snapshot = await adapter.fetchCatalog()
    const productCount = snapshot.diagnostics.groupCount
    const variantCount = snapshot.diagnostics.variantCount
    const definitionCount = snapshot.diagnostics.definitionCount

    // Un catálogo vacío casi siempre significa avería (credenciales, permisos o
    // un fallo del ERP), no "no hay productos". Se reporta como ERROR: marcarlo
    // como éxito dejaba el panel en verde mientras nada se sincronizaba.
    if (snapshot.groups.length === 0) {
      return {
        success: false,
        processedCount: 0,
        productCount,
        variantCount,
        definitionCount,
        dryRun: options.dryRun ?? false,
        error:
          "El ERP devolvió 0 productos. Revisa que el catálogo tenga ítems y que la integración esté operativa.",
      }
    }

    if (snapshot.stock.status === "partial") {
      return {
        success: false,
        processedCount: 0,
        productCount,
        variantCount,
        definitionCount,
        dryRun: options.dryRun ?? false,
        warnings: snapshot.stock.errors,
        error:
          `La consulta de stock fue parcial (${snapshot.stock.resolvedCount}/${snapshot.stock.requestedCount} SKU). ` +
          "Se conservó el inventario existente.",
      }
    }

    if (snapshot.stock.status === "all_zero") {
      return {
        success: false,
        processedCount: 0,
        productCount,
        variantCount,
        definitionCount,
        dryRun: options.dryRun ?? false,
        error:
          "Loggro respondió con stock total en cero para todo el catálogo. " +
          "La sincronización se bloqueó para conservar el inventario existente.",
      }
    }

    const writableGroups = getWritableGroups(snapshot.groups)
    if (!writableGroups) {
      return {
        success: false,
        processedCount: 0,
        productCount,
        variantCount,
        definitionCount,
        dryRun: options.dryRun ?? false,
        error: "El catálogo contiene variantes cuyo stock es desconocido. No se aplicaron cambios.",
      }
    }

    if (options.dryRun) {
      return {
        success: true,
        processedCount: productCount,
        productCount,
        variantCount,
        definitionCount,
        dryRun: true,
      }
    }

    if (process.env.ERP_CATALOG_WRITES_ENABLED !== "true") {
      return {
        success: false,
        processedCount: 0,
        productCount,
        variantCount,
        definitionCount,
        dryRun: false,
        error:
          "Las escrituras del catálogo están pausadas mientras se valida y repara la importación existente. " +
          "Usa dry-run o habilita ERP_CATALOG_WRITES_ENABLED cuando la reparación haya sido aprobada.",
      }
    }

    // Buscar la categoría "Por Defecto" o crearla para asignar nuevos productos
    let defaultCategory = await findDefaultImportCategory()

    if (!defaultCategory) {
      defaultCategory = await createDefaultImportCategory()
    }

    // Paleta activa: permite deducir el color de cada variante desde el texto
    // que envía el ERP. Se lee una sola vez por sincronización.
    const paletteNames = (await findManyProductColors(true)).map((c) => c.name)
    const suggestedCategoryIds = new Map<string, string>()
    const colorFamilyKeyUpdates: Array<{ productId: string; key: string | null }> = []
    const genderCandidates: Array<{
      erpId: string
      gender: NonNullable<ERPCatalogProductGroup["gender"]>
    }> = []
    const categoryCandidates: Array<{ erpId: string; categoryId: string }> = []

    // El adaptador ya normalizó el catálogo plano del ERP en productos padre
    // con variantes vendibles. El servicio no conoce campos propios de Loggro.
    for (const group of writableGroups) {
      const baseSku = group.sku
      const variantsList = group.variants

      // Buscar si el producto principal ya existe
      let existingProduct = await findCatalogProductBySlug(baseSku)
      let suggestedCategoryId: string | undefined
      if (
        group.categorySuggestion &&
        (!existingProduct || existingProduct.categoryId === defaultCategory.id)
      ) {
        suggestedCategoryId = suggestedCategoryIds.get(group.categorySuggestion.slug)
        if (!suggestedCategoryId) {
          const category = await ensureCatalogCategory(group.categorySuggestion)
          suggestedCategoryId = category.id
          suggestedCategoryIds.set(group.categorySuggestion.slug, category.id)
        }
      }

      // 2.5 Buscar o crear la MARCA real (Loggro usa el campo Categoría para Marcas)
      let targetBrandId: string | null = null
      const loggroBrandName = group.categoryName?.trim()
      const loggroBrandErpId = group.brandErpId?.trim()

      if (loggroBrandName || loggroBrandErpId) {
        let brand = null
        
        // 1. Intentar buscar por erpId
        if (loggroBrandErpId) {
          brand = await findCatalogBrandByErpId(loggroBrandErpId)
        }
        
        // 2. Si no existe por erpId, buscar por slug
        if (!brand && loggroBrandName) {
          const brandSlug = loggroBrandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
          brand = await findCatalogBrandBySlug(brandSlug)
        }
        
        if (brand) {
          // Si encontró la marca pero no tiene el erpId actualizado, lo actualizamos
          if (loggroBrandErpId && brand.erpId !== loggroBrandErpId) {
            await updateCatalogBrandErpId(brand.id, loggroBrandErpId)
          }
          targetBrandId = brand.id
        } else {
          // Si no existe, crear la marca nueva
          let safeName = loggroBrandName || `Por nombrar (${loggroBrandErpId || Date.now()})`
          if (loggroBrandName === loggroBrandErpId) {
            safeName = `Por nombrar (${loggroBrandErpId})`
          }
          
          const baseSlug = safeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
          
          let brandSlug = baseSlug
          const count = await countCatalogBrandsBySlug(brandSlug)
          if (count > 0) brandSlug = `${baseSlug}-${Date.now()}`
            
          brand = await createCatalogBrand({
            name: safeName,
            slug: brandSlug,
            erpId: loggroBrandErpId || undefined,
          })
          targetBrandId = brand.id
        }
      }

      if (existingProduct) {
        // Actualizar datos base del producto
        await updateCatalogProduct(existingProduct.id, {
          basePrice: group.basePrice,
          unitOfMeasure: group.unitOfMeasure,
          brandId: targetBrandId,
        })
        if (existingProduct.gender == null && group.gender) {
          genderCandidates.push({ erpId: group.erpId, gender: group.gender })
        }
        if (
          existingProduct.categoryId === defaultCategory.id &&
          suggestedCategoryId
        ) {
          categoryCandidates.push({
            erpId: group.erpId,
            categoryId: suggestedCategoryId,
          })
        }
      } else {
        // Crear el producto principal
        existingProduct = await createCatalogProduct({
          name: group.name.split("-")[0].trim(), // Intentar limpiar el nombre
          slug: baseSku,
          basePrice: group.basePrice,
          unitOfMeasure: group.unitOfMeasure,
          categoryId: suggestedCategoryId ?? defaultCategory.id,
          brandId: targetBrandId,
          gender: group.gender,
          erpId: group.erpId,
        })
      }

      // 3. Sincronizar las Variantes de este producto
      for (const variantItem of variantsList) {
        const existingVariant = existingProduct.variants.find((v) => v.sku === variantItem.sku)
        
        // La talla sale del propio SKU (ver `parseSku`).
        const { size } = parseSku(variantItem.sku)

        // El ERP no expone el color como campo, pero lo menciona en la
        // descripción ("TENIS HOKA BONDI 9 NEGRO"): se deduce contra la paleta
        // administrable. Si no se reconoce, queda vacío para asignarlo a mano.
        const detectedColor =
          detectColorFromText(variantItem.detailedName, paletteNames) ??
          detectColorFromText(variantItem.name, paletteNames) ??
          ""

        if (existingVariant) {
          await updateCatalogVariant(existingVariant.id, {
            erpId: variantItem.erpId,
            stock: variantItem.stock,
            size: size !== DEFAULT_SIZE ? size : existingVariant.size,
            // Nunca se pisa un color ya asignado: el admin manda sobre el ERP.
            ...(isRealColor(existingVariant.color) || !detectedColor
              ? {}
              : { color: detectedColor }),
          })
        } else {
          await createCatalogVariant({
            productId: existingProduct.id,
            sku: variantItem.sku,
            erpId: variantItem.erpId,
            size,
            color: detectedColor,
            stock: variantItem.stock,
          })
        }
      }

      colorFamilyKeyUpdates.push({
        productId: existingProduct.id,
        key: group.colorFamilyKey ?? null,
      })
    }

    await fillMissingCatalogProductGenders(genderCandidates)
    await fillDefaultCatalogProductCategories(categoryCandidates, defaultCategory.id)
    const colorFamilyResult = await applyErpColorFamilyKeyUpdates(colorFamilyKeyUpdates)
    const colorFamilyActions = colorFamilyResult.reconciliation.plan.actions

    return {
      success: true,
      processedCount: productCount,
      productCount,
      variantCount,
      definitionCount,
      dryRun: false,
      colorFamilies: {
        created: colorFamilyActions.filter((action) => action.mode === "create").length,
        updated: colorFamilyActions.filter((action) => action.mode === "add").length,
        omitted: colorFamilyResult.reconciliation.plan.omissions.length,
      },
    }
  } catch (error) {
    const msg = sanitizeErpError(error)
    console.error("[ERP Sync Service] Error sincronizando catálogo:", msg)
    return { success: false, processedCount: 0, error: msg }
  }
}

// ─────────────────────────────────────────────
// Estado del panel de integraciones
// ─────────────────────────────────────────────

/** Registro de sincronización serializable para el cliente (fechas como ISO). */
export interface ErpSyncLogDTO {
  id: string
  provider: string
  trigger: ErpSyncTrigger
  success: boolean
  processedCount: number
  error: string | null
  durationMs: number | null
  createdAt: string
}

export interface ErpSyncStatus {
  /** ERP configurado (ERP_PROVIDER). */
  provider: string
  /** ¿El ERP respondió al healthcheck? */
  connected: boolean
  /** ¿Está habilitado el coordinador automático? */
  autoSyncEnabled: boolean
  /** Intervalo del auto-sync, en minutos. */
  autoSyncMinutes: ErpSyncInterval
  /** Próximo vencimiento reclamable, en ISO; null cuando está desactivado. */
  nextAutoSyncAt: string | null
  /** Última sincronización registrada, o null si nunca se ha corrido. */
  last: ErpSyncLogDTO | null
  /** Historial reciente (más nueva primero). */
  history: ErpSyncLogDTO[]
}

function mapErpSyncLog(log: ErpSyncLog): ErpSyncLogDTO {
  return {
    id: log.id,
    provider: log.provider,
    trigger: log.trigger,
    success: log.success,
    processedCount: log.processedCount,
    error: log.error == null ? null : sanitizeErpError(log.error),
    durationMs: log.durationMs,
    createdAt: log.createdAt.toISOString(),
  }
}

const DIAGNOSTIC_ENDPOINTS = ["connection", "catalog", "stock"] as const
const DIAGNOSTIC_STATUSES = ["healthy", "warning", "error", "unsupported"] as const
let erpDiagnosticsInProgress = false

function failedDiagnostics(detail: string, status: "error" | "unsupported"): ERPEndpointDiagnostic[] {
  return DIAGNOSTIC_ENDPOINTS.map((endpoint) => ({
    endpoint,
    status,
    httpStatus: null,
    latencyMs: 0,
    detail,
  }))
}

function invalidDiagnostic(endpoint: ERPEndpointDiagnostic["endpoint"]): ERPEndpointDiagnostic {
  return {
    endpoint,
    status: "error",
    httpStatus: null,
    latencyMs: 0,
    detail: "El adaptador ERP no entregó un resultado de diagnóstico válido para este endpoint.",
  }
}

function normalizeDiagnostics(value: unknown): ERPEndpointDiagnostic[] {
  const candidates = Array.isArray(value) ? value : []

  return DIAGNOSTIC_ENDPOINTS.map((endpoint) => {
    const matches = candidates.filter(
      (candidate) =>
        candidate != null &&
        typeof candidate === "object" &&
        !Array.isArray(candidate) &&
        (candidate as { endpoint?: unknown }).endpoint === endpoint
    )
    if (matches.length !== 1) return invalidDiagnostic(endpoint)

    const candidate = matches[0] as Record<string, unknown>
    const statusValid = DIAGNOSTIC_STATUSES.includes(
      candidate.status as (typeof DIAGNOSTIC_STATUSES)[number]
    )
    const httpStatusValid =
      candidate.httpStatus === null ||
      (Number.isInteger(candidate.httpStatus) &&
        Number(candidate.httpStatus) >= 100 &&
        Number(candidate.httpStatus) <= 599)
    const latencyValid =
      typeof candidate.latencyMs === "number" &&
      Number.isFinite(candidate.latencyMs) &&
      candidate.latencyMs >= 0
    const detailValid = typeof candidate.detail === "string" && candidate.detail.trim().length > 0

    if (!statusValid || !httpStatusValid || !latencyValid || !detailValid) {
      return invalidDiagnostic(endpoint)
    }

    return {
      endpoint,
      status: candidate.status as ERPEndpointDiagnostic["status"],
      httpStatus: candidate.httpStatus as number | null,
      latencyMs: Math.round(candidate.latencyMs as number),
      detail: sanitizeErpError(candidate.detail),
    }
  })
}

/** Ejecuta bajo demanda los probes genéricos del adaptador sin escribir datos. */
export async function runErpEndpointDiagnostics(): Promise<ERPEndpointDiagnostics> {
  if (erpDiagnosticsInProgress) {
    return {
      checkedAt: new Date().toISOString(),
      results: failedDiagnostics("Ya hay un diagnóstico ERP en curso.", "error"),
    }
  }

  erpDiagnosticsInProgress = true
  try {
    const adapter = getERPAdapter()

    if (!adapter.diagnoseEndpoints) {
      return {
        checkedAt: new Date().toISOString(),
        results: failedDiagnostics(
          "El ERP configurado no ofrece pruebas detalladas de endpoints.",
          "unsupported"
        ),
      }
    }

    try {
      const results = await adapter.diagnoseEndpoints()
      return {
        checkedAt: new Date().toISOString(),
        results: normalizeDiagnostics(results),
      }
    } catch (error) {
      return {
        checkedAt: new Date().toISOString(),
        results: failedDiagnostics(sanitizeErpError(error), "error"),
      }
    }
  } finally {
    erpDiagnosticsInProgress = false
  }
}

/**
 * Estado de la integración para el panel de admin: conexión con el ERP,
 * última sincronización e historial reciente.
 */
export async function getErpSyncStatus(): Promise<ErpSyncStatus> {
  const adapter = getERPAdapter()

  const [connected, logs, schedule] = await Promise.all([
    // No dejamos que un ERP lento/caído cuelgue la carga del panel.
    Promise.race([
      adapter.ping().catch(() => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), PING_TIMEOUT_MS)),
    ]),
    findRecentErpSyncLogs(10),
    getErpSyncSchedule(),
  ])

  const history = logs.map(mapErpSyncLog)

  return {
    provider: erpProviderName(),
    connected,
    autoSyncEnabled: schedule.enabled,
    autoSyncMinutes: schedule.intervalMinutes,
    nextAutoSyncAt: schedule.nextRunAt,
    last: history[0] ?? null,
    history,
  }
}
