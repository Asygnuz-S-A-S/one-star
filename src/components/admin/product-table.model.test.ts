import { describe, expect, it, vi } from "vitest"

import {
  createSingleFlightRunner,
  getAdminProductStatus,
  getBulkPublishFeedback,
  getProductRowId,
} from "./product-table.model"

describe("createSingleFlightRunner", () => {
  it("ignora un segundo envío mientras la primera operación sigue pendiente", async () => {
    let finishFirst!: () => void
    const operation = vi.fn(() => new Promise<void>((resolve) => {
      finishFirst = resolve
    }))
    const runner = createSingleFlightRunner()

    const first = runner.run(operation)
    await expect(runner.run(operation)).resolves.toBe(false)
    expect(operation).toHaveBeenCalledOnce()

    finishFirst()
    await expect(first).resolves.toBe(true)
  })
})

describe("getAdminProductStatus", () => {
  it("prioriza el estado INACTIVO para productos despublicados", () => {
    expect(getAdminProductStatus({
      isPublished: false,
      isOnSale: true,
      variants: [{ stock: 5 }],
    })).toEqual({
      label: "INACTIVO",
      color: "bg-gray-200 text-gray-700",
    })
  })
})

describe("getBulkPublishFeedback", () => {
  it("conserva la selección y expone el mensaje cuando la acción falla", () => {
    expect(getBulkPublishFeedback(
      { success: false, error: "Sesión expirada." },
      false
    )).toEqual({
      clearSelection: false,
      message: "Sesión expirada.",
      type: "error",
    })
  })

  it("usa un mensaje seguro cuando el servidor devuelve un error vacío", () => {
    expect(getBulkPublishFeedback({ success: false, error: "   " }, false)).toEqual({
      clearSelection: false,
      message: "No se pudieron actualizar los productos.",
      type: "error",
    })
  })

  it("limpia la selección y confirma cuando la acción tiene éxito", () => {
    expect(getBulkPublishFeedback({ success: true }, true)).toEqual({
      clearSelection: true,
      message: "Productos activados correctamente.",
      type: "success",
    })
  })
})

describe("getProductRowId", () => {
  it("usa el identificador persistente del producto", () => {
    expect(getProductRowId({ id: "prod-42" })).toBe("prod-42")
  })
})
