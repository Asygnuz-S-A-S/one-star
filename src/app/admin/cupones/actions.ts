"use server"

import { revalidatePath } from "next/cache"
import {
  createCoupon as createCouponService,
  toggleCouponActive as toggleCouponActiveService,
  couponCodeExists,
} from "@/server/services/coupon.service"
import { requireSuperAdmin } from "@/server/auth/require-admin"
import { createCouponSchema } from "@/server/validators/coupon.validator"

export async function createCoupon(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin()
  } catch {
    return { success: false, error: "No autorizado." }
  }

  const parsed = createCouponSchema.safeParse({
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    minOrderAmount: formData.get("minOrderAmount"),
    maxUses: formData.get("maxUses"),
    categoryId: formData.get("categoryId"),
    validFrom: formData.get("validFrom"),
    validUntil: formData.get("validUntil"),
    isActive: formData.get("isActive") === "true",
    clubOnly: formData.get("clubOnly") === "true",
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos del cupón inválidos." }
  }

  try {
    const exists = await couponCodeExists(parsed.data.code)
    if (exists) {
      return { success: false, error: "Ya existe un cupón con ese código." }
    }

    await createCouponService(parsed.data)
    revalidatePath("/admin/cupones")
    return { success: true }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[createCoupon]", error instanceof Error ? error.message : error)
    }
    return { success: false, error: "Error al crear el cupón." }
  }
}

export async function toggleCouponActive(
  id: string,
  current: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin()
    await toggleCouponActiveService(id, current)
    revalidatePath("/admin/cupones")
    return { success: true }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[toggleCouponActive]", error instanceof Error ? error.message : error)
    }
    return { success: false, error: "Error al cambiar el estado." }
  }
}
