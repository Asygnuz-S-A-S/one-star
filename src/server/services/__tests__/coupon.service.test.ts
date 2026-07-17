import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/coupon.repository", () => ({
  findManyCoupons: vi.fn(),
  findCouponByCode: vi.fn(),
  createCouponRecord: vi.fn(),
  updateCouponRecord: vi.fn(),
  incrementCouponUsage: vi.fn(),
}))

import {
  getAllCoupons,
  validateCoupon,
  validateCouponForOrder,
  couponCodeExists,
  createCoupon,
  toggleCouponActive,
  registerCouponUsage,
  releaseCouponUsage,
} from "../coupon.service"
import {
  findManyCoupons,
  findCouponByCode,
  createCouponRecord,
  updateCouponRecord,
  incrementCouponUsage,
} from "@/server/repositories/coupon.repository"

const mockFindMany = vi.mocked(findManyCoupons)
const mockFindByCode = vi.mocked(findCouponByCode)
const mockCreate = vi.mocked(createCouponRecord)
const mockUpdate = vi.mocked(updateCouponRecord)
const mockIncrement = vi.mocked(incrementCouponUsage)

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

describe("validateCouponForOrder", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calcula el descuento porcentual sobre el subtotal", async () => {
    mockFindByCode.mockResolvedValue(activeCoupon as never)
    const result = await validateCouponForOrder("PROMO20", 100000)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.discountAmount).toBe(20000)
      expect(result.code).toBe("PROMO20")
    }
  })

  it("aplica el monto fijo sin superar el subtotal", async () => {
    const fixed = {
      ...activeCoupon,
      discountType: "FIXED_AMOUNT" as const,
      discountValue: makeFullDecimal(80000),
      minOrderAmount: null,
    }
    mockFindByCode.mockResolvedValue(fixed as never)
    const result = await validateCouponForOrder("PROMO20", 60000)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.discountAmount).toBe(60000)
  })

  it("normaliza el código a mayúsculas antes de buscar", async () => {
    mockFindByCode.mockResolvedValue(activeCoupon as never)
    await validateCouponForOrder("  promo20 ", 100000)
    expect(mockFindByCode).toHaveBeenCalledWith("PROMO20")
  })

  it("rechaza cuando el subtotal no alcanza la compra mínima", async () => {
    mockFindByCode.mockResolvedValue(activeCoupon as never)
    const result = await validateCouponForOrder("PROMO20", 30000)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toContain("compra mínima")
  })

  it("rechaza cuando alcanzó el límite de usos", async () => {
    mockFindByCode.mockResolvedValue({ ...activeCoupon, maxUses: 5, usedCount: 5 } as never)
    const result = await validateCouponForOrder("PROMO20", 100000)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toContain("límite de usos")
  })

  it("rechaza cupones vencidos", async () => {
    mockFindByCode.mockResolvedValue({ ...activeCoupon, validUntil: yesterday } as never)
    const result = await validateCouponForOrder("PROMO20", 100000)
    expect(result.valid).toBe(false)
  })

  it("rechaza cupones inexistentes o inactivos", async () => {
    mockFindByCode.mockResolvedValue(null)
    expect((await validateCouponForOrder("GHOST", 100000)).valid).toBe(false)
    mockFindByCode.mockResolvedValue({ ...activeCoupon, isActive: false } as never)
    expect((await validateCouponForOrder("PROMO20", 100000)).valid).toBe(false)
  })
})

describe("registerCouponUsage / releaseCouponUsage", () => {
  beforeEach(() => vi.clearAllMocks())

  it("registra el uso y propaga el resultado del repositorio", async () => {
    mockIncrement.mockResolvedValue(true)
    expect(await registerCouponUsage("cup-1")).toBe(true)
    mockIncrement.mockResolvedValue(false)
    expect(await registerCouponUsage("cup-1")).toBe(false)
  })

  it("libera un uso decrementando el contador", async () => {
    mockUpdate.mockResolvedValue(undefined as never)
    await releaseCouponUsage("cup-1")
    expect(mockUpdate).toHaveBeenCalledWith("cup-1", { usedCount: { decrement: 1 } })
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
