import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma } from "@prisma/client"

export async function findManyCoupons() {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } })
}

export async function findCouponByCode(code: string) {
  return prisma.coupon.findUnique({ where: { code } })
}

export async function findCouponById(id: string) {
  return prisma.coupon.findUnique({ where: { id } })
}

export async function createCouponRecord(data: Prisma.CouponCreateInput) {
  return prisma.coupon.create({ data })
}

export async function updateCouponRecord(id: string, data: Prisma.CouponUpdateInput) {
  return prisma.coupon.update({ where: { id }, data })
}

/**
 * Incrementa el contador de usos de forma atómica. Si el cupón tiene un tope
 * (`maxUses`), la condición en el WHERE evita sobrepasarlo bajo concurrencia.
 * Devuelve `true` si el uso quedó registrado.
 */
export async function incrementCouponUsage(id: string): Promise<boolean> {
  const result = await prisma.coupon.updateMany({
    where: {
      id,
      OR: [{ maxUses: null }, { usedCount: { lt: prisma.coupon.fields.maxUses } }],
    },
    data: { usedCount: { increment: 1 } },
  })
  return result.count > 0
}
