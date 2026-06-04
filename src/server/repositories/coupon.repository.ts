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
