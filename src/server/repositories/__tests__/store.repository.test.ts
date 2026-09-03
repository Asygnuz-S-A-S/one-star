import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { findMany, update, create } = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: { storeLocation: { findMany, update, create } },
}))

import { STORE_LOCATION_PENDING } from "@/lib/store-location"
import { ensureErpStoreLocations } from "../store.repository"

describe("ensureErpStoreLocations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findMany.mockResolvedValue([
      { id: "store-linked", name: "One Star Centro", erpId: "est-centro" },
      { id: "store-manual", name: "One Star Fundadores", erpId: null },
    ])
    create.mockImplementation(async ({ data }: { data: { erpId: string } }) => ({
      id: `created-${data.erpId}`,
    }))
    update.mockResolvedValue({})
  })

  it("reutiliza la sede vinculada, enlaza por nombre y crea ocultas las desconocidas", async () => {
    const result = await ensureErpStoreLocations([
      { erpId: "est-centro", name: "CENTRO" },
      { erpId: "est-fundadores", name: "FUNDADORES" },
      { erpId: "est-pereira", name: "One Star Pereira" },
    ])

    expect(result.get("est-centro")).toBe("store-linked")
    expect(result.get("est-fundadores")).toBe("store-manual")
    expect(result.get("est-pereira")).toBe("created-est-pereira")

    expect(update).toHaveBeenCalledWith({
      where: { id: "store-manual" },
      data: { erpId: "est-fundadores" },
    })
    expect(create).toHaveBeenCalledWith({
      data: {
        erpId: "est-pereira",
        name: "One Star Pereira",
        address: STORE_LOCATION_PENDING,
        city: STORE_LOCATION_PENDING,
        isActive: false,
      },
      select: { id: true },
    })
  })

  it("no vincula dos establecimientos a la misma sede manual", async () => {
    const result = await ensureErpStoreLocations([
      { erpId: "est-a", name: "Fundadores" },
      { erpId: "est-b", name: "FUNDADORES" },
    ])

    expect(result.get("est-a")).toBe("store-manual")
    expect(result.get("est-b")).toBe("created-est-b")
    expect(update).toHaveBeenCalledTimes(1)
  })

  it("no consulta la base cuando el ERP no distingue sedes", async () => {
    const result = await ensureErpStoreLocations([])
    expect(result.size).toBe(0)
    expect(findMany).not.toHaveBeenCalled()
  })
})
