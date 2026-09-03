import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/server/auth/require-admin", () => ({ requireAdmin: vi.fn() }))
vi.mock("@/server/services/product.service", () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  searchProducts: vi.fn(),
  updateProductsPublishStatus: vi.fn(),
}))

import { bulkToggleProductsPublishStatus } from "./actions"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/server/auth/require-admin"
import { updateProductsPublishStatus } from "@/server/services/product.service"

const mockRequireAdmin = vi.mocked(requireAdmin)
const mockUpdateProductsPublishStatus = vi.mocked(updateProductsPublishStatus)
const mockRevalidatePath = vi.mocked(revalidatePath)
const PRODUCT_ID_1 = "c000000000000000000000001"
const PRODUCT_ID_2 = "c000000000000000000000002"

describe("bulkToggleProductsPublishStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({} as never)
  })

  it("rechaza una selección vacía sin llamar al servicio", async () => {
    const result = await bulkToggleProductsPublishStatus([], true)

    expect(result).toEqual({
      success: false,
      error: "Selecciona al menos un producto.",
    })
    expect(mockUpdateProductsPublishStatus).not.toHaveBeenCalled()
  })

  it("rechaza identificadores vacíos sin llamar al servicio", async () => {
    const result = await bulkToggleProductsPublishStatus(["   "], true)

    expect(result).toEqual({
      success: false,
      error: "El identificador del producto es obligatorio.",
    })
    expect(mockUpdateProductsPublishStatus).not.toHaveBeenCalled()
  })

  it("rechaza identificadores que no son CUID sin llamar al servicio", async () => {
    const result = await bulkToggleProductsPublishStatus(["prod-1"], true)

    expect(result).toEqual({
      success: false,
      error: "El identificador del producto no es válido.",
    })
    expect(mockUpdateProductsPublishStatus).not.toHaveBeenCalled()
  })

  it("rechaza IDs duplicados sin llamar al servicio", async () => {
    const result = await bulkToggleProductsPublishStatus([PRODUCT_ID_1, PRODUCT_ID_1], false)

    expect(result).toEqual({
      success: false,
      error: "La selección contiene productos duplicados.",
    })
    expect(mockUpdateProductsPublishStatus).not.toHaveBeenCalled()
  })

  it("rechaza selecciones excesivas sin llamar al servicio", async () => {
    const ids = Array.from(
      { length: 101 },
      (_, index) => `c${String(index).padStart(24, "0")}`
    )

    const result = await bulkToggleProductsPublishStatus(ids, true)

    expect(result).toEqual({
      success: false,
      error: "No puedes actualizar más de 100 productos a la vez.",
    })
    expect(mockUpdateProductsPublishStatus).not.toHaveBeenCalled()
  })

  it("actualiza y revalida el listado cuando el payload es válido", async () => {
    mockUpdateProductsPublishStatus.mockResolvedValue(2)

    const result = await bulkToggleProductsPublishStatus(
      [PRODUCT_ID_1, PRODUCT_ID_2],
      false
    )

    expect(result).toEqual({ success: true })
    expect(mockUpdateProductsPublishStatus).toHaveBeenCalledWith(
      [PRODUCT_ID_1, PRODUCT_ID_2],
      false
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/productos")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/productos")
  })

  it("propaga un error legible del servicio sin revalidar", async () => {
    mockUpdateProductsPublishStatus.mockRejectedValue(
      new Error("No se pudieron actualizar todos los productos seleccionados.")
    )

    const result = await bulkToggleProductsPublishStatus([PRODUCT_ID_1], true)

    expect(result).toEqual({
      success: false,
      error: "No se pudieron actualizar todos los productos seleccionados.",
    })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it("no valida ni actualiza cuando la sesión no está autorizada", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("No autorizado."))

    const result = await bulkToggleProductsPublishStatus([PRODUCT_ID_1], true)

    expect(result).toEqual({ success: false, error: "No autorizado." })
    expect(mockUpdateProductsPublishStatus).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})
