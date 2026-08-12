import "server-only"
import { getERPAdapter } from "@/server/erp"
import { prisma } from "@/server/db/prisma"
import type { ErpSyncLog, ErpSyncTrigger } from "@prisma/client"
import type { ERPCatalogSyncResult } from "@/server/erp/erp.types"
import { parseSku, DEFAULT_SIZE } from "@/lib/sku"
import { detectColorFromText } from "@/lib/color-detect"
import { isRealColor } from "@/lib/colors"
import { findManyProductColors } from "@/server/repositories/product-color.repository"
import {
  createErpSyncLog,
  findRecentErpSyncLogs,
} from "@/server/repositories/erp-sync-log.repository"

/** Minutos entre sincronizaciones automáticas (refleja el cron de instrumentation-node.ts). */
export const ERP_AUTO_SYNC_MINUTES = 30

/** Máximo que esperamos por el healthcheck del ERP antes de darlo por caído. */
const PING_TIMEOUT_MS = 5000

function erpProviderName(): string {
  return (process.env.ERP_PROVIDER ?? "null").toLowerCase().trim()
}

/**
 * Sincroniza el catálogo desde el ERP y registra el resultado en la BD para
 * alimentar el panel de estado e historial de /admin/integraciones.
 *
 * @param trigger Quién disparó la sincronización (manual desde el panel o AUTO por cron).
 */
export async function syncCatalogFromERP(
  trigger: ErpSyncTrigger = "AUTO"
): Promise<ERPCatalogSyncResult> {
  const startedAt = Date.now()
  const result = await runCatalogSync()

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

  return result
}

/**
 * Sincroniza el catálogo de productos desde el ERP activo hacia la base de datos local.
 * Si el adaptador actual no soporta `fetchCatalog`, falla pacíficamente.
 */
async function runCatalogSync(): Promise<ERPCatalogSyncResult> {
  const adapter = getERPAdapter()

  if (!adapter.fetchCatalog) {
    return {
      success: false,
      processedCount: 0,
      error: "El ERP configurado no soporta la descarga completa del catálogo (fetchCatalog no implementado).",
    }
  }

  try {
    const products = await adapter.fetchCatalog()
    let count = 0

    // Un catálogo vacío casi siempre significa avería (credenciales, permisos o
    // un fallo del ERP), no "no hay productos". Se reporta como ERROR: marcarlo
    // como éxito dejaba el panel en verde mientras nada se sincronizaba.
    if (products.length === 0) {
      return {
        success: false,
        processedCount: 0,
        error:
          "El ERP devolvió 0 productos. Revisa que el catálogo tenga ítems y que la integración esté operativa.",
      }
    }

    // Buscar la categoría "Por Defecto" o crearla para asignar nuevos productos
    let defaultCategory = await prisma.category.findFirst({
      where: { slug: "sin-categoria" },
    })

    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: {
          name: "Sin Categoría",
          slug: "sin-categoria",
          description: "Categoría por defecto para productos importados del ERP",
        },
      })
    }

    // Paleta activa: permite deducir el color de cada variante desde el texto
    // que envía el ERP. Se lee una sola vez por sincronización.
    const paletteNames = (await findManyProductColors(true)).map((c) => c.name)

    // 1. Agrupar los ítems del ERP por "Producto Base" según su SKU.
    //    Ver `parseSku`: "1162011-BWHT_10" agrupa por modelo+color y "NB574AZ-38"
    //    por modelo, de modo que cada grupo es un producto con sus tallas.
    const groupedProducts = new Map<string, typeof products>()

    for (const erpProduct of products) {
      if (!erpProduct.sku) continue

      const { baseSku } = parseSku(erpProduct.sku)

      if (!groupedProducts.has(baseSku)) {
        groupedProducts.set(baseSku, [])
      }
      groupedProducts.get(baseSku)!.push(erpProduct)
    }

    // 2. Procesar cada grupo como un único Producto en la plataforma
    for (const [baseSku, variantsList] of groupedProducts.entries()) {
      // Tomamos el primer ítem del grupo para la info base del producto
      const baseItem = variantsList[0]

      // Buscar si el producto principal ya existe
      let existingProduct = await prisma.product.findFirst({
        where: { slug: baseSku },
        include: { variants: true },
      })

      // 2.5 Buscar o crear la MARCA real (Loggro usa el campo Categoría para Marcas)
      let targetBrandId: string | null = null
      const loggroBrandName = baseItem.categoryName?.trim()
      const loggroBrandErpId = baseItem.brandErpId?.trim()

      if (loggroBrandName || loggroBrandErpId) {
        let brand = null
        
        // 1. Intentar buscar por erpId
        if (loggroBrandErpId) {
          brand = await prisma.brand.findFirst({ where: { erpId: loggroBrandErpId } })
        }
        
        // 2. Si no existe por erpId, buscar por slug
        if (!brand && loggroBrandName) {
          const brandSlug = loggroBrandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
          brand = await prisma.brand.findFirst({ where: { slug: brandSlug } })
        }
        
        if (brand) {
          // Si encontró la marca pero no tiene el erpId actualizado, lo actualizamos
          if (loggroBrandErpId && brand.erpId !== loggroBrandErpId) {
            await prisma.brand.update({
              where: { id: brand.id },
              data: { erpId: loggroBrandErpId }
            })
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
          const count = await prisma.brand.count({ where: { slug: brandSlug } })
          if (count > 0) brandSlug = `${baseSlug}-${Date.now()}`
            
          brand = await prisma.brand.create({
            data: {
              name: safeName,
              slug: brandSlug,
              erpId: loggroBrandErpId || undefined,
            }
          })
          targetBrandId = brand.id
        }
      }

      if (existingProduct) {
        // Actualizar datos base del producto
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            basePrice: baseItem.basePrice,
            unitOfMeasure: baseItem.unitOfMeasure,
            brandId: targetBrandId,
          },
        })
      } else {
        // Crear el producto principal
        existingProduct = await prisma.product.create({
          data: {
            name: baseItem.name.split("-")[0].trim(), // Intentar limpiar el nombre
            slug: baseSku,
            basePrice: baseItem.basePrice,
            unitOfMeasure: baseItem.unitOfMeasure,
            categoryId: defaultCategory.id, // Lo mandamos a Sin Categoría temporalmente
            brandId: targetBrandId,
            erpId: baseItem.erpId, // Guardamos el erpId del primer item como ref del producto
          },
          include: { variants: true },
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
          await prisma.variant.update({
            where: { id: existingVariant.id },
            data: {
              erpId: variantItem.erpId,
              stock: variantItem.stock,
              size: size !== DEFAULT_SIZE ? size : existingVariant.size,
              // Nunca se pisa un color ya asignado: el admin manda sobre el ERP.
              ...(isRealColor(existingVariant.color) || !detectedColor
                ? {}
                : { color: detectedColor }),
            },
          })
        } else {
          await prisma.variant.create({
            data: {
              productId: existingProduct.id,
              sku: variantItem.sku,
              erpId: variantItem.erpId,
              size: size,
              color: detectedColor,
              stock: variantItem.stock,
            }
          })
        }
        count++
      }
    }

    return { success: true, processedCount: count }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
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
  /** Intervalo del auto-sync, en minutos. */
  autoSyncMinutes: number
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
    error: log.error,
    durationMs: log.durationMs,
    createdAt: log.createdAt.toISOString(),
  }
}

/**
 * Estado de la integración para el panel de admin: conexión con el ERP,
 * última sincronización e historial reciente.
 */
export async function getErpSyncStatus(): Promise<ErpSyncStatus> {
  const adapter = getERPAdapter()

  const [connected, logs] = await Promise.all([
    // No dejamos que un ERP lento/caído cuelgue la carga del panel.
    Promise.race([
      adapter.ping().catch(() => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), PING_TIMEOUT_MS)),
    ]),
    findRecentErpSyncLogs(10),
  ])

  const history = logs.map(mapErpSyncLog)

  return {
    provider: erpProviderName(),
    connected,
    autoSyncMinutes: ERP_AUTO_SYNC_MINUTES,
    last: history[0] ?? null,
    history,
  }
}
