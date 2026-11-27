import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const upsert = vi.fn()
const updateMany = vi.fn()
const queryRaw = vi.fn()

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    webVisitor: {
      upsert: (...args: unknown[]) => upsert(...args),
      updateMany: (...args: unknown[]) => updateMany(...args),
    },
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}))

const { findUtmCampaignPerformance, upsertWebVisitor } = await import("../web-analytics.repository")

beforeEach(() => {
  upsert.mockReset().mockResolvedValue({ id: "vis_1" })
  updateMany.mockReset().mockResolvedValue({ count: 0 })
  queryRaw.mockReset().mockResolvedValue([])
})

describe("upsertWebVisitor", () => {
  it("no intenta completar UTMs cuando la visita no trae utm_source ni utm_campaign", async () => {
    await upsertWebVisitor({
      anonId: "anon-1",
      landingPath: null,
      referrer: null,
      device: "mobile",
      utm: { source: null, medium: null, campaign: null, content: null, term: null },
    })

    expect(upsert).toHaveBeenCalledTimes(1)
    expect(updateMany).not.toHaveBeenCalled()
  })

  it("completa UTMs de forma atómica solo si el visitante aún no tenía atribución", async () => {
    await upsertWebVisitor({
      anonId: "anon-1",
      landingPath: null,
      referrer: null,
      device: "mobile",
      utm: {
        source: "meta",
        medium: "cpc",
        campaign: "lanzamiento_hoka",
        content: "reel_1",
        term: null,
      },
    })

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "vis_1", utmCampaign: null, utmSource: null },
      data: {
        utmSource: "meta",
        utmMedium: "cpc",
        utmCampaign: "lanzamiento_hoka",
        utmContent: "reel_1",
        utmTerm: null,
      },
    })
  })
})

describe("findUtmCampaignPerformance", () => {
  it("convierte los conteos bigint de PostgreSQL a números", async () => {
    queryRaw.mockResolvedValue([
      {
        campaign: "black_week",
        source: "meta",
        medium: "paid_social",
        visitors: BigInt(120),
        product_viewers: BigInt(85),
        checkout_starters: BigInt(18),
        buyers: BigInt(6),
      },
    ])

    const rows = await findUtmCampaignPerformance(30, 25)

    expect(rows).toEqual([
      {
        campaign: "black_week",
        source: "meta",
        medium: "paid_social",
        visitors: 120,
        productViewers: 85,
        checkoutStarters: 18,
        buyers: 6,
      },
    ])
  })
})
