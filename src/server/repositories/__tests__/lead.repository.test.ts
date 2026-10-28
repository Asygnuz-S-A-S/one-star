import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const userMock = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}))

const abandonedCartMock = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: userMock,
    abandonedCart: abandonedCartMock,
  },
}))

import { getLeadsData } from "../lead.repository"

describe("lead.repository", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("combina prospectos de usuario sin orden pagada y carritos abandonados", async () => {
    userMock.findMany.mockResolvedValueOnce([
      {
        id: "u1",
        email: "socio@onestar.com",
        name: "Diego",
        lastName: "Perez",
        phone: "3110001122",
        preferredBrand: "New Balance",
        gender: "hombre",
        clubMember: true,
        createdAt: new Date("2026-10-20T10:00:00Z"),
        cart: {
          items: [
            {
              quantity: 1,
              product: { name: "574 Core", basePrice: 420000, salePrice: null, isOnSale: false },
              variant: { size: "40" },
            },
          ],
        },
        orders: [],
      },
    ])

    abandonedCartMock.findMany.mockResolvedValueOnce([
      {
        id: "ac1",
        email: "abandonado@gmail.com",
        cartData: {
          items: [{ price: 300000, quantity: 1 }],
        },
        userId: null,
        recoveredAt: null,
        createdAt: new Date("2026-10-18T15:00:00Z"),
      },
    ])

    userMock.count.mockResolvedValueOnce(10) // total converted
    userMock.count.mockResolvedValueOnce(5)  // total club
    abandonedCartMock.count.mockResolvedValueOnce(1) // total abandoned

    const res = await getLeadsData({ take: 10, skip: 0 })

    expect(res.total).toBe(2)
    expect(res.leads).toHaveLength(2)

    // El primer lead debe ser el más reciente (u1)
    expect(res.leads[0].email).toBe("socio@onestar.com")
    expect(res.leads[0].stage).toBe("CARRITO_ACTIVO")
    expect(res.leads[0].estimatedValue).toBe(420000)

    // El segundo lead es el carrito abandonado sin usuario
    expect(res.leads[1].email).toBe("abandonado@gmail.com")
    expect(res.leads[1].stage).toBe("CARRITO_ABANDONADO")
    expect(res.leads[1].estimatedValue).toBe(300000)

    expect(res.stats.convertedCustomersCount).toBe(10)
    expect(res.stats.clubMembersCount).toBe(5)
    expect(res.stats.abandonedCartsCount).toBe(1)
  })

  it("filtra por origen CLUB correctamente", async () => {
    userMock.findMany.mockResolvedValueOnce([
      {
        id: "u1",
        email: "club@onestar.com",
        name: "Elena",
        lastName: "Rios",
        phone: null,
        preferredBrand: "Veja",
        gender: "mujer",
        clubMember: true,
        createdAt: new Date("2026-10-22T10:00:00Z"),
        cart: null,
        orders: [],
      },
    ])

    abandonedCartMock.findMany.mockResolvedValueOnce([])
    userMock.count.mockResolvedValue(0)
    abandonedCartMock.count.mockResolvedValue(0)

    const res = await getLeadsData({ source: "CLUB" })

    expect(res.leads).toHaveLength(1)
    expect(res.leads[0].source).toBe("One Star Club")
    expect(res.leads[0].stage).toBe("CLUB_REGISTRADO")
  })
})
