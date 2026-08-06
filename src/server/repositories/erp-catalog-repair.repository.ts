import "server-only"

import { prisma } from "@/server/db/prisma"
import type { ErpCatalogRepairPlan, LocalErpCatalogProduct } from "@/server/services/erp-catalog-repair.plan"

/** Carga únicamente la información necesaria para planear una reparación segura. */
export async function loadErpCatalogRepairState(): Promise<LocalErpCatalogProduct[]> {
  const products = await prisma.product.findMany({
    where: { erpId: { not: null } },
    include: {
      category: { select: { slug: true } },
      images: { select: { id: true } },
      variants: {
        select: {
          id: true,
          erpId: true,
          sku: true,
          _count: { select: { cartItems: true, orderItems: true, inventory: true } },
        },
      },
      _count: {
        select: {
          cartItems: true,
          orderItems: true,
          crossSells: true,
          crossSoldBy: true,
        },
      },
    },
  })

  return products.map((product) => {
    const enrichedFields = [
      product.description,
      product.extendedDescription,
      product.videoUrl,
      product.metaTitle,
      product.metaDescription,
      product.gender,
    ].filter(Boolean).length
    const protectedDataCount =
      product.images.length +
      enrichedFields +
      Number(product.category.slug !== "sin-categoria") +
      product._count.cartItems +
      product._count.orderItems +
      product._count.crossSells +
      product._count.crossSoldBy

    return {
      id: product.id,
      erpId: product.erpId,
      slug: product.slug,
      protectedDataCount,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        erpId: variant.erpId,
        sku: variant.sku,
        protectedDataCount:
          variant._count.cartItems +
          variant._count.orderItems +
          variant._count.inventory,
      })),
    }
  })
}

/** Aplica el plan completo en una transacción: cualquier conflicto revierte todo. */
export async function applyErpCatalogRepairPlan(plan: ErpCatalogRepairPlan) {
  return prisma.$transaction(async (tx) => {
    const deletedVariants = plan.deleteVariantIds.length
      ? await tx.variant.deleteMany({ where: { id: { in: plan.deleteVariantIds } } })
      : { count: 0 }
    if (deletedVariants.count !== plan.deleteVariantIds.length) {
      throw new Error("El catálogo cambió mientras se eliminaban variantes inválidas.")
    }

    for (const move of plan.moveVariants) {
      await tx.variant.update({
        where: { id: move.variantId },
        data: { productId: move.targetProductId },
      })
    }

    const deletedProducts = plan.deleteProductIds.length
      ? await tx.product.deleteMany({ where: { id: { in: plan.deleteProductIds } } })
      : { count: 0 }
    if (deletedProducts.count !== plan.deleteProductIds.length) {
      throw new Error("El catálogo cambió mientras se eliminaban productos duplicados.")
    }

    for (const target of plan.targetProducts) {
      await tx.product.update({
        where: { id: target.productId },
        data: {
          erpId: target.erpId,
          slug: target.sku,
          name: target.name,
          basePrice: target.basePrice,
          unitOfMeasure: target.unitOfMeasure,
        },
      })
    }

    return {
      products: plan.targetProducts.length,
      movedVariants: plan.moveVariants.length,
      deletedVariants: deletedVariants.count,
      deletedProducts: deletedProducts.count,
    }
  }, { isolationLevel: "Serializable" })
}
