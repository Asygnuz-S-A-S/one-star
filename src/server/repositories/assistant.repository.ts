import "server-only"

import { prisma } from "../db/prisma"
import { productInclude } from "./product.repository"
import { parseSku } from "@/lib/sku"

/**
 * Busca un producto para consultar stock a través de slug, SKU base o nombre.
 */
export async function findProductForStockCheck(identifier: string) {
  const trimmed = identifier.trim()
  if (!trimmed) return null

  // 1. Por slug exacto
  const bySlug = await prisma.product.findFirst({
    where: { slug: trimmed, isPublished: true },
    include: productInclude,
  })
  if (bySlug) return bySlug

  // 2. Por SKU base de alguna variante
  const parsed = parseSku(trimmed)
  const byVariantSku = await prisma.variant.findFirst({
    where: {
      OR: [
        { sku: { equals: trimmed, mode: "insensitive" } },
        { sku: { startsWith: parsed.baseSku, mode: "insensitive" } },
      ],
      product: { isPublished: true },
    },
    include: { product: { include: productInclude } },
  })
  if (byVariantSku?.product) return byVariantSku.product

  // 3. Por nombre de producto (búsqueda parcial case-insensitive)
  const byName = await prisma.product.findFirst({
    where: { name: { contains: trimmed, mode: "insensitive" }, isPublished: true },
    include: productInclude,
  })
  if (byName) return byName

  return null
}

/**
 * Busca pedidos candidatos por cédula para el asistente.
 * Excluye pedidos cancelados hace más de 30 días.
 */
export async function findOrdersForAssistant(cedulaDigits: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  return prisma.order.findMany({
    where: {
      OR: [
        { customerDocument: cedulaDigits },
        { user: { is: { cedula: cedulaDigits } } },
        { shippingAddress: { path: ["cedula"], equals: cedulaDigits } },
      ],
      NOT: {
        AND: [
          { status: "CANCELLED" },
          { createdAt: { lt: thirtyDaysAgo } },
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { cedula: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true } },
          variant: { select: { id: true, size: true, color: true, sku: true } },
        },
      },
    },
    take: 10,
  })
}
