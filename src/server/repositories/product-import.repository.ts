import "server-only"

import { faqsFromText, highlightsFromText } from "@/lib/product-faq"
import { slugify } from "@/lib/utils"
import type { Gender, Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import type { ProductForImport } from "@/server/repositories/product.repository"
import type { PlannedGroup } from "@/server/services/product-import.service"
import { normalizeKey, resolveBrandAlias } from "@/server/validators/product-import.validator"

type TxClient = Prisma.TransactionClient

export interface ProductImportPersistenceResult {
  newProducts: number
  newVariants: number
  updatedVariants: number
  deactivatedProducts?: number
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

export async function persistProductImport(
  groups: PlannedGroup[],
  existingProductsMap: Map<string, ProductForImport>,
  categories: { id: string; name: string }[],
  brands: { id: string; name: string }[],
  isOverwrite: boolean,
  productsToDeactivateIds: string[] = [],
): Promise<ProductImportPersistenceResult> {
  const categoryCache = new Map<string, string>()
  const brandCache = new Map<string, string>()

  let newProducts = 0
  let newVariants = 0
  let updatedVariants = 0

  await prisma.$transaction(
    async (tx) => {
      if (productsToDeactivateIds.length > 0) {
        await tx.product.updateMany({
          where: { id: { in: productsToDeactivateIds } },
          data: { isPublished: false },
        })
      }

      const colorGroupMap = new Map<string, string[]>()

      for (const group of groups) {
        let productId = group.existingProductId

        if (!productId) {
          const categoryId = await resolveCategoryId(tx, group.categoryName, categories, categoryCache)
          const brandId = await resolveBrandId(tx, group.brandName, brands, brandCache)
          const first = group.variants.find((v) => v.kind === "create")!.row
          const slugBase = group.baseSku ? group.baseSku : slugify(group.name)
          const slug = await uniqueSlug(tx, slugBase)
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
          const parsedHighlights = first.highlights ? highlightsFromText(first.highlights.replace(/;/g, "\n")) : []
          const parsedFaqs = first.faqs ? faqsFromText(first.faqs) : []

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
              isFeatured: first.isFeatured ?? false,
              isLaunch: first.isLaunch ?? false,
              highlights: parsedHighlights,
              ...(parsedFaqs.length > 0 ? { faqs: parsedFaqs as unknown as Prisma.InputJsonValue } : {}),
              metaTitle: first.metaTitle ?? null,
              metaDescription: first.metaDescription ?? null,
              images: { create: images },
            },
          })
          productId = created.id
          newProducts++
        } else {
          // Actualización de producto existente en modo ARCHIVO
          const existingProduct = existingProductsMap.get(productId)
          const first = group.variants[0].row

          const categoryId =
            isOverwrite || !existingProduct?.categoryId
              ? await resolveCategoryId(tx, group.categoryName, categories, categoryCache)
              : existingProduct.categoryId

          const brandId =
            isOverwrite || !existingProduct?.brandId
              ? await resolveBrandId(tx, group.brandName, brands, brandCache)
              : existingProduct.brandId

          await tx.product.update({
            where: { id: productId },
            data: {
              // Precios y disponibilidad web siempre los manda el archivo en ARCHIVO
              basePrice: first.price,
              isOnSale: first.isOnSale ?? false,
              salePrice: first.isOnSale ? (first.salePrice ?? null) : null,
              availableOnline: first.availableOnline ?? true,
              availableInStores: first.availableInStores ?? true,
              isPublished: first.isPublished ?? true,
              ...(first.isFeatured !== undefined ? { isFeatured: first.isFeatured } : {}),
              ...(first.isLaunch !== undefined ? { isLaunch: first.isLaunch } : {}),
              ...(first.highlights !== undefined && first.highlights !== ""
                ? { highlights: highlightsFromText(first.highlights.replace(/;/g, "\n")) }
                : {}),
              ...(first.faqs !== undefined && first.faqs !== ""
                ? { faqs: faqsFromText(first.faqs) as unknown as Prisma.InputJsonValue }
                : {}),
              // Campos de texto: según textUpdateMode ("fill_empty" vs "overwrite")
              ...(isOverwrite || !existingProduct?.name ? { name: group.name } : {}),
              ...(isOverwrite || !existingProduct?.description
                ? { description: first.description ?? null }
                : {}),
              ...(isOverwrite || !existingProduct?.extendedDescription
                ? { extendedDescription: first.extendedDescription ?? null }
                : {}),
              ...(isOverwrite || !existingProduct?.videoUrl
                ? { videoUrl: first.videoUrl ?? null }
                : {}),
              ...(isOverwrite || !existingProduct?.gender
                ? { gender: (first.gender as Gender | undefined) ?? null }
                : {}),
              ...(isOverwrite || !existingProduct?.metaTitle
                ? { metaTitle: first.metaTitle ?? null }
                : {}),
              ...(isOverwrite || !existingProduct?.metaDescription
                ? { metaDescription: first.metaDescription ?? null }
                : {}),
              ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
              ...(brandId ? { brand: { connect: { id: brandId } } } : {}),
            },
          })

          // Conservar fotos existentes e incorporar fotos nuevas sin borrar las actuales
          const current = await tx.productImage.findMany({
            where: { productId },
            select: { url: true },
          })
          const seen = new Set(current.map((i) => i.url))
          let position = current.length
          const extra: Prisma.ProductImageCreateManyInput[] = []
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
              if (url && !seen.has(url)) {
                seen.add(url)
                extra.push({
                  productId,
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

        // Variantes y niveles de inventario web (storeLocationId = null)
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
            await tx.inventoryLevel.deleteMany({
              where: {
                variantId: v.existingVariantId,
                storeLocationId: null,
              },
            })
            await tx.inventoryLevel.create({
              data: {
                variantId: v.existingVariantId,
                storeLocationId: null,
                stock: v.row.stock,
              },
            })
            updatedVariants++
          } else {
            const createdVar = await tx.variant.create({
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
            await tx.inventoryLevel.create({
              data: {
                variantId: createdVar.id,
                storeLocationId: null,
                stock: v.row.stock,
              },
            })
            newVariants++
          }
        }

        if (group.colorGroup && productId) {
          const key = normalizeKey(group.colorGroup)
          const current = colorGroupMap.get(key) ?? []
          current.push(productId)
          colorGroupMap.set(key, current)
        }
      }

      for (const productIds of colorGroupMap.values()) {
        const uniqueIds = [...new Set(productIds)]
        if (uniqueIds.length < 2) continue

        const existingProds = await tx.product.findMany({
          where: { id: { in: uniqueIds } },
          select: { id: true, colorFamilyId: true },
        })
        const existingFamilyId = existingProds.find((product) => product.colorFamilyId)?.colorFamilyId
        let targetFamilyId = existingFamilyId
        if (!targetFamilyId) {
          const newFamily = await tx.productColorFamily.create({ data: {} })
          targetFamilyId = newFamily.id
        }
        await tx.product.updateMany({
          where: { id: { in: uniqueIds } },
          data: { colorFamilyId: targetFamilyId },
        })
      }
    },
    { timeout: 120_000, maxWait: 10_000 }
  )

  return {
    newProducts,
    newVariants,
    updatedVariants,
    ...(productsToDeactivateIds.length > 0 ? { deactivatedProducts: productsToDeactivateIds.length } : {}),
  }
}
