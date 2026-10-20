import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => {
  class UnauthorizedError extends Error {}
  return {
    UnauthorizedError,
    requireSuperAdmin: vi.fn(),
    updateCatalogSource: vi.fn(),
    revalidatePath: vi.fn(),
  }
})

vi.mock("@/server/auth/require-admin", () => ({
  UnauthorizedError: mocks.UnauthorizedError,
  requireSuperAdmin: mocks.requireSuperAdmin,
}))

vi.mock("@/server/services/store-settings.service", () => ({
  updateCatalogSource: mocks.updateCatalogSource,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

import { updateCatalogSourceAction } from "../store-settings.actions"

describe("updateCatalogSourceAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rechaza la actualización si el usuario no es super admin", async () => {
    mocks.requireSuperAdmin.mockRejectedValue(
      new mocks.UnauthorizedError("Solo los super administradores pueden modificar esta configuración.")
    )

    const formData = new FormData()
    formData.set("catalogSource", "ERP")

    const result = await updateCatalogSourceAction(formData)

    expect(mocks.updateCatalogSource).not.toHaveBeenCalled()
    expect(result).toEqual({
      success: false,
      error: "Solo los super administradores pueden modificar esta configuración.",
    })
  })

  it("actualiza la fuente del catálogo si el usuario es super admin", async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ id: "super-admin-id" })
    mocks.updateCatalogSource.mockResolvedValue({ catalogSource: "ERP" })

    const formData = new FormData()
    formData.set("catalogSource", "ERP")

    const result = await updateCatalogSourceAction(formData)

    expect(mocks.updateCatalogSource).toHaveBeenCalledWith("ERP")
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/integraciones")
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/productos")
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/productos/importar")
    expect(result).toEqual({ success: true })
  })

  it("rechaza valores inválidos que no sean ERP o ARCHIVO", async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ id: "super-admin-id" })

    const formData = new FormData()
    formData.set("catalogSource", "INVALIDO")

    const result = await updateCatalogSourceAction(formData)

    expect(mocks.updateCatalogSource).not.toHaveBeenCalled()
    expect(result.success).toBe(false)
    expect(result.error).toContain("La fuente debe ser ERP o ARCHIVO")
  })
})
