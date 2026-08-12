import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/coupon.repository", () => ({
  findManyCoupons: vi.fn(),
  findCouponByCode: vi.fn(),
  createCouponRecord: vi.fn(),
  updateCouponRecord: vi.fn(),
}))

import {
  getAllCoupons,
  validateCoupon,
  couponCodeExists,
  createCoupon,
  toggleCouponActive,
} from "../coupon.service"
import {
  findManyCoupons,
  findCouponByCode,
  createCouponRecord,
  updateCouponRecord,
} from "@/server/repositories/coupon.repository"

const mockFindMany = vi.mocked(findManyCoupons)
const mockFindByCode = vi.mocked(findCouponByCode)
const mockCreate = vi.mocked(createCouponRecord)
const mockUpdate = vi.mocked(updateCouponRecord)

const makeDecimal = (n: number) => ({ toNumber: () => n })

const now = new Date()
const tomorrow = new Date(now.getTime() + 86400_000)
const yesterday = new Date(now.getTime() - 86400_000)

// makeDecimal simula el tipo Decimal de Prisma: Number() y .toNumber() ambos funcionan
const makeFullDecimal = (n: number) => Object.assign(n, { toNumber: () => n })

const activeCoupon = {
  id: "cup-1",
  code: "PROMO20",
  discountType: "PERCENTAGE" as const,
  discountValue: makeFullDecimal(20),
  minOrderAmount: makeFullDecimal(50000),
  maxUses: 100,
  usedCount: 5,
  validFrom: yesterday,
  validUntil: tomorrow,
  isActive: true,
  categoryId: null,
  createdAt: yesterday,
}

describe("getAllCoupons", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna la lista mapeada a DTO", async () => {
    mockFindMany.mockResolvedValue([activeCoupon] as never)
    const result = await getAllCoupons()
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe("PROMO20")
    expect(result[0].discountValue).toBe(20)
    expect(result[0].minOrderAmount).toBe(50000)
  })

  it("retorna arreglo vacío cuando no hay cupones", async () => {
    mockFindMany.mockResolvedValue([])
    const result = await getAllCoupons()
    expect(result).toEqual([])
  })
})

describe("validateCoupon", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna datos del cupón cuando es válido y activo", async () => {
    mockFindByCode.mockResolvedValue(activeCoupon as never)
    const result = await validateCoupon("PROMO20")
    expect(result).not.toBeNull()
    expect(result!.discountValue).toBe(20)
    expect(result!.discountType).toBe("PERCENTAGE")
  })

  it("retorna null cuando el cupón no existe", async () => {
    mockFindByCode.mockResolvedValue(null)
    const result = await validateCoupon("NOEXISTE")
    expect(result).toBeNull()
  })

  it("retorna null cuando el cupón está inactivo", async () => {
    mockFindByCode.mockResolvedValue({ ...activeCoupon, isActive: false } as never)
    const result = await validateCoupon("PROMO20")
    expect(result).toBeNull()
  })

  it("retorna null cuando el cupón ya venció", async () => {
    mockFindByCode.mockResolvedValue({ ...activeCoupon, validUntil: yesterday } as never)
    const result = await validateCoupon("PROMO20")
    expect(result).toBeNull()
  })

  it("retorna null cuando el cupón aún no inicia", async () => {
    mockFindByCode.mockResolvedValue({ ...activeCoupon, validFrom: tomorrow } as never)
    const result = await validateCoupon("PROMO20")
    expect(result).toBeNull()
  })
})

describe("couponCodeExists", () => {
  it("retorna true si el código existe", async () => {
    mockFindByCode.mockResolvedValue(activeCoupon as never)
    expect(await couponCodeExists("PROMO20")).toBe(true)
  })

  it("retorna false si el código no existe", async () => {
    mockFindByCode.mockResolvedValue(null)
    expect(await couponCodeExists("GHOST")).toBe(false)
  })
})

describe("createCoupon", () => {
  it("llama al repositorio con los datos correctos", async () => {
    mockCreate.mockResolvedValue(undefined as never)
    await createCoupon({
      code: "NUEVO10",
      discountType: "FIXED_AMOUNT",
      discountValue: 10000,
      validFrom: yesterday,
      validUntil: tomorrow,
    })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ code: "NUEVO10", discountValue: 10000 })
    )
  })
})

describe("toggleCouponActive", () => {
  it("desactiva un cupón activo", async () => {
    mockUpdate.mockResolvedValue(undefined as never)
    await toggleCouponActive("cup-1", true)
    expect(mockUpdate).toHaveBeenCalledWith("cup-1", { isActive: false })
  })

  it("activa un cupón inactivo", async () => {
    mockUpdate.mockResolvedValue(undefined as never)
    await toggleCouponActive("cup-1", false)
    expect(mockUpdate).toHaveBeenCalledWith("cup-1", { isActive: true })
  })
})
