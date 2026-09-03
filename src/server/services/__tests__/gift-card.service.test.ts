import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/gift-card.repository", () => ({
  findPurchasableGiftCardVariants: vi.fn(),
}))

import { getGiftCardOptions } from "@/server/services/gift-card.service"
import { findPurchasableGiftCardVariants } from "@/server/repositories/gift-card.repository"

const findVariants = vi.mocked(findPurchasableGiftCardVariants)

function variant(overrides: {
  id: string
  amount: number
  stock?: number
  sku?: string
  productId?: string
}) {
  return {
    id: overrides.id,
    sku: overrides.sku ?? `GIFT-CARD-${overrides.amount}`,
    stock: overrides.stock ?? 100,
    productId: overrides.productId ?? `prod-${overrides.id}`,
    product: { basePrice: new Prisma.Decimal(overrides.amount) },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getGiftCardOptions", () => {
  it("devuelve los montos comprables ordenados de menor a mayor", async () => {
    findVariants.mockResolvedValue([
      variant({ id: "v3", amount: 200_000 }),
      variant({ id: "v1", amount: 50_000 }),
      variant({ id: "v2", amount: 100_000 }),
    ])

    const options = await getGiftCardOptions()

    expect(options.map((o) => o.amount)).toEqual([50_000, 100_000, 200_000])
    expect(options[0]).toMatchObject({
      variantId: "v1",
      productId: "prod-v1",
      sku: "GIFT-CARD-50000",
    })
  })

  it("descarta variantes sin stock para no ofrecer un monto que el checkout rechaza", async () => {
    findVariants.mockResolvedValue([
      variant({ id: "v1", amount: 50_000, stock: 0 }),
      variant({ id: "v2", amount: 100_000, stock: 5 }),
    ])

    const options = await getGiftCardOptions()

    expect(options.map((o) => o.variantId)).toEqual(["v2"])
  })

  it("descarta montos fuera del rango permitido", async () => {
    findVariants.mockResolvedValue([
      variant({ id: "v1", amount: 10_000 }),
      variant({ id: "v2", amount: 5_000_000 }),
      variant({ id: "v3", amount: 300_000 }),
    ])

    const options = await getGiftCardOptions()

    expect(options.map((o) => o.amount)).toEqual([300_000])
  })

  it("devuelve una lista vacía cuando no hay tarjetas publicadas", async () => {
    findVariants.mockResolvedValue([])

    expect(await getGiftCardOptions()).toEqual([])
  })
})
