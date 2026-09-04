import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/erp", () => ({ getERPAdapter: vi.fn() }))
vi.mock("@/server/repositories/store.repository", () => ({
  createStoreLocation: vi.fn().mockResolvedValue({ id: "store-1" }),
  deleteStoreLocation: vi.fn().mockResolvedValue({}),
  findStoreLocations: vi.fn().mockResolvedValue([{ id: "store-1" }]),
  setStoreLocationActive: vi.fn().mockResolvedValue({}),
  updateStoreLocation: vi.fn().mockResolvedValue({ id: "store-1" }),
}))

import { getERPAdapter } from "@/server/erp"
import {
  createStoreLocation,
  deleteStoreLocation,
  setStoreLocationActive,
  updateStoreLocation,
} from "@/server/repositories/store.repository"
import {
  createStore,
  deleteStore,
  getErpStockLocations,
  getStoreLocations,
  setStoreActive,
  updateStore,
} from "../store.service"

const mockGetERPAdapter = vi.mocked(getERPAdapter)
const input = {
  name: "One Star Centro",
  address: "Cra 50 # 50-20",
  city: "Medellín",
  phone: null,
  schedule: null,
  googleMapsUrl: null,
  latitude: null,
  longitude: null,
  isActive: true,
  erpId: "est-centro",
}

describe("store.service", () => {
  beforeEach(() => vi.clearAllMocks())

  it("delega el CRUD de sedes al repositorio", async () => {
    await expect(getStoreLocations()).resolves.toEqual([{ id: "store-1" }])
    await createStore(input)
    await updateStore("store-1", input)
    await deleteStore("store-1")
    await setStoreActive("store-1", false)

    expect(createStoreLocation).toHaveBeenCalledWith(input)
    expect(updateStoreLocation).toHaveBeenCalledWith("store-1", input)
    expect(deleteStoreLocation).toHaveBeenCalledWith("store-1")
    expect(setStoreLocationActive).toHaveBeenCalledWith("store-1", false)
  })

  it("lista las sedes del ERP cuando el adaptador las distingue", async () => {
    mockGetERPAdapter.mockReturnValue({
      listStockLocations: vi.fn().mockResolvedValue([{ erpId: "est-1", name: "Fundadores" }]),
    } as never)

    await expect(getErpStockLocations()).resolves.toEqual([{ erpId: "est-1", name: "Fundadores" }])
  })

  it("devuelve una lista vacía si el adaptador no soporta sedes o el ERP falla", async () => {
    mockGetERPAdapter.mockReturnValue({} as never)
    await expect(getErpStockLocations()).resolves.toEqual([])

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    mockGetERPAdapter.mockReturnValue({
      listStockLocations: vi.fn().mockRejectedValue(new Error("timeout")),
    } as never)
    await expect(getErpStockLocations()).resolves.toEqual([])
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
