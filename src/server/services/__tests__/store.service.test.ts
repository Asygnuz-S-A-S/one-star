import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/store.repository", () => ({
  findStoreLocations: vi.fn(),
}))

import { getStoreLocations } from "../store.service"
import { findStoreLocations } from "@/server/repositories/store.repository"

const findStores = vi.mocked(findStoreLocations)

beforeEach(() => vi.clearAllMocks())

describe("getStoreLocations", () => {
  it("devuelve las tiendas tal como las entrega el repositorio", async () => {
    const tiendas = [{ id: "st_1", name: "One Star Centro" }]
    findStores.mockResolvedValue(tiendas as never)

    expect(await getStoreLocations()).toBe(tiendas)
  })

  it("devuelve una lista vacía cuando no hay tiendas registradas", async () => {
    findStores.mockResolvedValue([])

    expect(await getStoreLocations()).toEqual([])
  })
})
