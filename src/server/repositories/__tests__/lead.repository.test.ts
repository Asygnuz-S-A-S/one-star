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

const leadMock = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
}))

const leadEventMock = vi.hoisted(() => ({
  create: vi.fn(),
}))

const orderMock = vi.hoisted(() => ({
  update: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: userMock,
    abandonedCart: abandonedCartMock,
    lead: leadMock,
    leadEvent: leadEventMock,
    order: orderMock,
  },
}))

import {
  attachLeadToOrderRecord,
  buildPhoneCandidates,
  createLeadEventRecord,
  findLeadById,
  findLeadByPhone,
  findLeadByShortCode,
  findStaleLeadsForAbandonment,
  getLeadsData,
  updateLeadShortLinkRecord,
  updateLeadStageRecord,
  updateLeadUtmRecord,
  upsertLeadRecord,
} from "../lead.repository"

describe("lead.repository", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    leadMock.findMany.mockResolvedValue([])
    leadMock.count.mockResolvedValue(0)
  })

  it("combina prospectos de usuario sin orden pagada, carritos abandonados y leads de WhatsApp", async () => {
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

    leadMock.findMany.mockResolvedValueOnce([
      {
        id: "l1",
        waPhone: "573001234567",
        name: "Laura WA",
        source: "WHATSAPP",
        stage: "INTERESADO",
        utmSource: "whatsapp",
        utmMedium: "asistente",
        utmCampaign: "lanzamiento_vans",
        utmContent: "code123",
        ctwaClid: "ctwa_99",
        optedOut: false,
        consentAt: new Date("2026-10-25T10:00:00Z"),
        createdAt: new Date("2026-10-25T10:00:00Z"),
        updatedAt: new Date("2026-10-25T10:00:00Z"),
        lastInteractionAt: new Date("2026-10-25T10:00:00Z"),
        events: [
          {
            id: "ev1",
            type: "LINK_CLICK",
            stage: "INTERESADO",
            metadata: { shortCode: "code123" },
            createdAt: new Date("2026-10-25T10:05:00Z"),
          },
        ],
        orders: [],
      },
    ])

    userMock.count.mockResolvedValueOnce(10)
    userMock.count.mockResolvedValueOnce(5)
    abandonedCartMock.count.mockResolvedValueOnce(1)
    leadMock.count.mockResolvedValueOnce(1)

    const res = await getLeadsData({ take: 10, skip: 0 })

    expect(res.total).toBe(3)
    expect(res.leads).toHaveLength(3)
    expect(res.leads[0].source).toBe("WhatsApp")
    expect(res.leads[0].waPhone).toBe("573001234567")
    expect(res.leads[0].utmCampaign).toBe("lanzamiento_vans")
    expect(res.leads[0].events).toHaveLength(1)
    expect(res.stats.whatsappLeadsCount).toBe(1)
  })

  it("filtra por origen WHATSAPP, etapa y UTM correctamente", async () => {
    userMock.findMany.mockResolvedValueOnce([])
    abandonedCartMock.findMany.mockResolvedValueOnce([])
    leadMock.findMany.mockResolvedValueOnce([
      {
        id: "l1",
        waPhone: "573001234567",
        name: "Laura WA",
        source: "WHATSAPP",
        stage: "CHECKOUT",
        utmSource: "whatsapp",
        utmMedium: "asistente",
        utmCampaign: "black_friday",
        utmContent: "bf01",
        ctwaClid: null,
        optedOut: false,
        consentAt: null,
        createdAt: new Date("2026-10-25T10:00:00Z"),
        updatedAt: new Date("2026-10-25T10:00:00Z"),
        lastInteractionAt: new Date("2026-10-25T10:00:00Z"),
        events: [],
        orders: [],
      },
    ])
    userMock.count.mockResolvedValue(0)
    abandonedCartMock.count.mockResolvedValue(0)
    leadMock.count.mockResolvedValue(1)

    const res = await getLeadsData({
      source: "WHATSAPP",
      stage: "CHECKOUT",
      utm: "black_friday",
    })

    expect(res.leads).toHaveLength(1)
    expect(res.leads[0].stage).toBe("CHECKOUT")
  })

  it("ejecuta operaciones de lectura y escritura de Lead y LeadEvent", async () => {
    expect(buildPhoneCandidates("+57 300 123 4567")).toEqual([
      "573001234567",
      "3001234567",
    ])

    leadMock.findUnique.mockResolvedValueOnce({ id: "l1", waPhone: "573001234567" })
    await expect(findLeadById("l1")).resolves.toEqual({ id: "l1", waPhone: "573001234567" })

    leadMock.findUnique.mockResolvedValueOnce(null)
    leadMock.findFirst.mockResolvedValueOnce({ id: "l1", waPhone: "573001234567" })
    await expect(findLeadByPhone("3001234567")).resolves.toEqual({
      id: "l1",
      waPhone: "573001234567",
    })

    leadMock.findUnique.mockResolvedValueOnce({ id: "l1", shortCode: "abc12345" })
    await expect(findLeadByShortCode("abc12345")).resolves.toEqual({
      id: "l1",
      shortCode: "abc12345",
    })

    leadMock.upsert.mockResolvedValueOnce({ id: "l1", waPhone: "573001234567" })
    await upsertLeadRecord({ waPhone: "573001234567", name: "Test", optedOut: false })
    expect(leadMock.upsert).toHaveBeenCalled()

    leadMock.update.mockResolvedValue({ id: "l1" })
    await updateLeadStageRecord("l1", "CARRITO")
    await updateLeadShortLinkRecord("l1", {
      shortCode: "c1",
      productSlug: "vans",
      utmSource: "whatsapp",
      utmMedium: "asistente",
      utmCampaign: "camp",
      utmContent: "c1",
    })
    await updateLeadUtmRecord("l1", {
      utmSource: "whatsapp",
      utmMedium: "asistente",
      utmCampaign: "camp",
      utmContent: "c1",
    })
    expect(leadMock.update).toHaveBeenCalledTimes(3)

    leadEventMock.create.mockResolvedValueOnce({ id: "ev1" })
    await createLeadEventRecord({ leadId: "l1", type: "LINK_CLICK", stage: "INTERESADO" })
    expect(leadEventMock.create).toHaveBeenCalled()

    orderMock.update.mockResolvedValueOnce({ id: "o1", leadId: "l1" })
    await attachLeadToOrderRecord("o1", "l1")
    expect(orderMock.update).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: { leadId: "l1" },
    })

    leadMock.findMany.mockResolvedValueOnce([{ id: "l1", stage: "CARRITO", waPhone: "573001234567" }])
    const stale = await findStaleLeadsForAbandonment(new Date())
    expect(stale).toHaveLength(1)
  })
})
