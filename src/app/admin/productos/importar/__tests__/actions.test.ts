import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/server/auth/require-admin", () => ({
  requireAdmin: vi.fn(async () => ({
    id: "admin-1",
    role: "SUPER_ADMIN",
  })),
}))

vi.mock("@/server/services/product-import.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/product-import.service")>()
  return {
    ...actual,
    previewProductImport: vi.fn(async () => ({
      rows: [],
      summary: { newProducts: 1, newVariants: 0, updatedVariants: 0, errors: 0 },
      fingerprint: "test-fingerprint",
    })),
    applyProductImport: vi.fn(async () => ({
      newProducts: 1,
      newVariants: 1,
      updatedVariants: 0,
    })),
  }
})

import { previewProductImportAction, applyProductImportAction } from "../actions"
import { previewProductImport, applyProductImport } from "@/server/services/product-import.service"

describe("previewProductImportAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("retorna error si no se adjunta ningún archivo", async () => {
    const formData = new FormData()
    const result = await previewProductImportAction(formData)
    expect(result).toEqual({ success: false, error: "No se recibió ningún archivo." })
    expect(previewProductImport).not.toHaveBeenCalled()
  })

  it("valida el archivo antes de leer el buffer en memoria (extensión rechazada)", async () => {
    const formData = new FormData()
    const badFile = new File(["fake content"], "catalogo.xlsm", {
      type: "application/vnd.ms-excel.sheet.macroEnabled.12",
    })
    formData.append("file", badFile)

    const arrayBufferSpy = vi.spyOn(badFile, "arrayBuffer")

    const result = await previewProductImportAction(formData)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/solo se admiten archivos con extensión \.xlsx/i)
    // Confirma que arrayBuffer() NUNCA fue invocado antes de validar
    expect(arrayBufferSpy).not.toHaveBeenCalled()
    expect(previewProductImport).not.toHaveBeenCalled()
  })

  it("valida el archivo antes de leer el buffer en memoria (tamaño excedido > 2MB)", async () => {
    const formData = new FormData()
    // Creamos un archivo simulado con propiedad size > 2MB
    const bigFile = new File([""], "catalogo.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    Object.defineProperty(bigFile, "size", { value: 3 * 1024 * 1024 })
    formData.append("file", bigFile)

    const arrayBufferSpy = vi.spyOn(bigFile, "arrayBuffer")

    const result = await previewProductImportAction(formData)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/excede el tamaño máximo permitido de 2 MB/i)
    expect(arrayBufferSpy).not.toHaveBeenCalled()
    expect(previewProductImport).not.toHaveBeenCalled()
  })

  it("procesa exitosamente un archivo válido", async () => {
    const formData = new FormData()
    const validFile = new File(["dummy xlsx bytes"], "catalogo.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    formData.append("file", validFile)

    const result = await previewProductImportAction(formData)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.fingerprint).toBe("test-fingerprint")
    expect(previewProductImport).toHaveBeenCalledTimes(1)
  })
})

describe("applyProductImportAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("retorna error si no se adjunta archivo", async () => {
    const formData = new FormData()
    formData.append("fingerprint", "fp-123")
    const result = await applyProductImportAction(formData)
    expect(result).toEqual({ success: false, error: "No se recibió ningún archivo." })
    expect(applyProductImport).not.toHaveBeenCalled()
  })

  it("valida el archivo antes de leerlo en memoria", async () => {
    const formData = new FormData()
    const badFile = new File(["fake content"], "catalogo.csv", { type: "text/csv" })
    formData.append("file", badFile)
    formData.append("fingerprint", "fp-123")

    const arrayBufferSpy = vi.spyOn(badFile, "arrayBuffer")

    const result = await applyProductImportAction(formData)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/solo se admiten archivos con extensión \.xlsx/i)
    expect(arrayBufferSpy).not.toHaveBeenCalled()
    expect(applyProductImport).not.toHaveBeenCalled()
  })

  it("falla si falta el fingerprint", async () => {
    const formData = new FormData()
    const validFile = new File(["dummy"], "catalogo.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    formData.append("file", validFile)

    const result = await applyProductImportAction(formData)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/falta la vista previa/i)
    expect(applyProductImport).not.toHaveBeenCalled()
  })

  it("aplica la importación exitosamente cuando el archivo y fingerprint son válidos", async () => {
    const formData = new FormData()
    const validFile = new File(["dummy"], "catalogo.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    formData.append("file", validFile)
    formData.append("fingerprint", "valid-fp")

    const result = await applyProductImportAction(formData)
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ newProducts: 1, newVariants: 1, updatedVariants: 0 })
    expect(applyProductImport).toHaveBeenCalledTimes(1)
  })
})
