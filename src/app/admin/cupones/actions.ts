"use server"

/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: Coupon model + DiscountType enum exist in schema.prisma but not yet in the
// generated Prisma client. Will resolve after `prisma generate`.
import { prisma } from "@/server/db/prisma"
import { revalidatePath } from "next/cache"

const db = prisma as any

export async function createCoupon(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const code = (formData.get("code") as string).toUpperCase().trim()
    const discountType = formData.get("discountType") as string
    const discountValue = parseFloat(formData.get("discountValue") as string)
    const minOrderAmountRaw = formData.get("minOrderAmount") as string
    const maxUsesRaw = formData.get("maxUses") as string
    const categoryIdRaw = formData.get("categoryId") as string
    const validFrom = new Date(formData.get("validFrom") as string)
    const validUntil = new Date(formData.get("validUntil") as string)
    const isActive = formData.get("isActive") === "true"

    if (!code || !discountType || isNaN(discountValue)) {
      return { success: false, error: "Código, tipo y valor son obligatorios." }
    }

    const existing = await db.coupon.findUnique({ where: { code } })
    if (existing) {
      return { success: false, error: "Ya existe un cupón con ese código." }
    }

    await db.coupon.create({
      data: {
        code,
        discountType,
        discountValue,
        minOrderAmount: minOrderAmountRaw ? parseFloat(minOrderAmountRaw) : null,
        maxUses: maxUsesRaw ? parseInt(maxUsesRaw) : null,
        categoryId: categoryIdRaw || null,
        validFrom,
        validUntil,
        isActive,
      },
    })
    revalidatePath("/admin/cupones")
    return { success: true }
  } catch (error) {
    console.error("[createCoupon]", error)
    return { success: false, error: "Error al crear el cupón." }
  }
}

export async function toggleCouponActive(
  id: string,
  current: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.coupon.update({
      where: { id },
      data: { isActive: !current },
    })
    revalidatePath("/admin/cupones")
    return { success: true }
  } catch (error) {
    console.error("[toggleCouponActive]", error)
    return { success: false, error: "Error al cambiar el estado." }
  }
}
