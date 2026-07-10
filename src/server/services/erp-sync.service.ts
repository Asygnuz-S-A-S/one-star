import "server-only"
import { getERPAdapter } from "@/server/erp"
import { prisma } from "@/server/db/prisma"
import type { ERPCatalogSyncResult } from "@/server/erp/erp.types"

/**
 * Sincroniza el catálogo de productos desde el ERP activo hacia la base de datos local.
 * Si el adaptador actual no soporta `fetchCatalog`, falla pacíficamente.
 */
export async function syncCatalogFromERP(): Promise<ERPCatalogSyncResult> {
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

    // Por seguridad, si el ERP retorna 0, quizás es un error.
    if (products.length === 0) {
      return { success: true, processedCount: 0, error: "El ERP devolvió 0 productos." }
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

    // Caché de marcas para no hacer queries repetidos
    const brandCache = new Map<string, string>()

    // 1. Agrupar los ítems de Loggro por "Producto Base" usando el SKU
    // Asumimos que el SKU tiene un formato "BASE-VARIANTE" (ej. "CAM01-M-ROJ")
    // Si no tiene guión, el producto base es el mismo SKU.
    const groupedProducts = new Map<string, typeof products>()

    for (const erpProduct of products) {
      if (!erpProduct.sku) continue
      
      const parts = erpProduct.sku.split("-")
      const baseSku = parts[0]
      
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
          let count = await prisma.brand.count({ where: { slug: brandSlug } })
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
        
        // Determinar talla y color basados en el sufijo del SKU (ej. CAM01-ROJO-M -> ROJO-M)
        const suffix = variantItem.sku.substring(baseSku.length + 1)
        const size = suffix ? suffix : "Única"
        const color = "N/A" // Loggro no suele separar color y talla fácilmente sin campos extra

        if (existingVariant) {
          await prisma.variant.update({
            where: { id: existingVariant.id },
            data: {
              erpId: variantItem.erpId,
              stock: variantItem.stock,
              size: size !== "Única" ? size : existingVariant.size,
            },
          })
        } else {
          await prisma.variant.create({
            data: {
              productId: existingProduct.id,
              sku: variantItem.sku,
              erpId: variantItem.erpId,
              size: size,
              color: color,
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
