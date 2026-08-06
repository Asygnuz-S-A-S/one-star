import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => {
  class UnauthorizedError extends Error {}
  return {
    UnauthorizedError,
    requireAdmin: vi.fn(),
    runErpEndpointDiagnostics: vi.fn(),
    syncCatalogFromERP: vi.fn(),
  }
})

vi.mock("@/server/auth/require-admin", () => ({
  UnauthorizedError: mocks.UnauthorizedError,
  requireAdmin: mocks.requireAdmin,
}))
vi.mock("@/server/services/erp-sync.service", () => ({
  runErpEndpointDiagnostics: mocks.runErpEndpointDiagnostics,
  syncCatalogFromERP: mocks.syncCatalogFromERP,
}))

import { diagnoseErpEndpointsAction } from "../erp.actions"

describe("diagnoseErpEndpointsAction", () => {
  beforeEach(() => vi.clearAllMocks())

  it("no ejecuta el diagnóstico cuando no hay sesión admin", async () => {
    mocks.requireAdmin.mockRejectedValue(new mocks.UnauthorizedError("No autorizado."))

    const result = await diagnoseErpEndpointsAction()

    expect(mocks.runErpEndpointDiagnostics).not.toHaveBeenCalled()
    expect(result).toMatchObject({ accessDenied: true, results: [] })
  })

  it("modela una sesión expirada como acceso denegado y no como fallo ERP", async () => {
    mocks.requireAdmin.mockRejectedValue(new mocks.UnauthorizedError("Sesión expirada"))

    const result = await diagnoseErpEndpointsAction()

    expect(mocks.runErpEndpointDiagnostics).not.toHaveBeenCalled()
    expect(result.results).toEqual([])
    expect(result).not.toHaveProperty("detail")
  })

  it("ejecuta el diagnóstico únicamente después de autorizar al admin", async () => {
    mocks.requireAdmin.mockResolvedValue({ user: { userType: "admin" } })
    mocks.runErpEndpointDiagnostics.mockResolvedValue({
      checkedAt: "2026-08-06T12:00:00.000Z",
      results: [],
    })

    const result = await diagnoseErpEndpointsAction()

    expect(mocks.requireAdmin).toHaveBeenCalledOnce()
    expect(mocks.runErpEndpointDiagnostics).toHaveBeenCalledOnce()
    expect(result).not.toHaveProperty("accessDenied")
  })
})
