import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/server/auth/require-admin", () => ({ requireSuperAdmin: vi.fn() }))
vi.mock("@/server/services/coupon.service", () => ({
  createCoupon: vi.fn(),
  couponCodeExists: vi.fn(),
  toggleCouponActive: vi.fn(),
}))

import { createCoupon } from "./actions"
import { requireSuperAdmin } from "@/server/auth/require-admin"
import { createCoupon as createCouponService, couponCodeExists } from "@/server/services/coupon.service"

const mockRequireSuperAdmin = vi.mocked(requireSuperAdmin)
const mockCreateCoupon = vi.mocked(createCouponService)
const mockCouponCodeExists = vi.mocked(couponCodeExists)

function validFormData(): FormData {
  const formData = new FormData()
  formData.set("code", " verano20 ")
  formData.set("discountType", "PERCENTAGE")
  formData.set("discountValue", "20")
  formData.set("minOrderAmount", "100000")
  formData.set("maxUses", "10")
  formData.set("categoryId", "")
  formData.set("validFrom", "2026-01-01")
  formData.set("validUntil", "2026-12-31")
  formData.set("isActive", "true")
  return formData
}

describe("createCoupon", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireSuperAdmin.mockResolvedValue({} as never)
    mockCouponCodeExists.mockResolvedValue(false)
  })

  it.each([
    ["un tipo no permitido", "discountType", "OTHER", "El tipo de descuento no es válido."],
    ["un número no finito", "discountValue", "Infinity", "El valor del descuento debe ser un número válido."],
    ["un porcentaje mayor a 100", "discountValue", "101", "El porcentaje no puede superar 100%."],
    ["un máximo de usos decimal", "maxUses", "1.5", "El máximo de usos debe ser un entero."],
    ["una categoría inválida", "categoryId", "cat-1", "La categoría no es válida."],
    ["una fecha inexistente", "validFrom", "2026-02-31", "La fecha no es válida."],
    ["fechas en orden inválido", "validUntil", "2026-01-01", "La fecha de fin debe ser posterior a la fecha de inicio."],
  ])("rechaza %s", async (_name, field, value, error) => {
    const formData = validFormData()
    formData.set(field, value)

    await expect(createCoupon(formData)).resolves.toEqual({ success: false, error })
    expect(mockCouponCodeExists).not.toHaveBeenCalled()
    expect(mockCreateCoupon).not.toHaveBeenCalled()
  })

  it("normaliza y crea un cupón válido", async () => {
    await expect(createCoupon(validFormData())).resolves.toEqual({ success: true })
    expect(mockCreateCoupon).toHaveBeenCalledWith(expect.objectContaining({ code: "VERANO20" }))
  })
})
