import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }))

const mockGetSession = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}))

const mockResolveActiveAdminRole = vi.hoisted(() => vi.fn())
vi.mock("@/server/services/admin-role.service", () => ({
  resolveActiveAdminRole: mockResolveActiveAdminRole,
}))

import {
  requireAdmin,
  requireSuperAdmin,
  getAdminRole,
  getAdminSession,
  UnauthorizedError,
} from "../require-admin"

function sessionWith(userType?: string, adminRole?: string | null, userId = "adm_1", email = "admin@onestar.com.co") {
  return {
    session: { id: "sess_1", token: "tok_1", userId },
    user: { id: userId, email, userType, adminRole },
  }
}

describe("require-admin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveActiveAdminRole.mockResolvedValue("SUPER_ADMIN")
  })

  describe("requireAdmin", () => {
    it("pasa cuando el rol activo en base de datos es SUPER_ADMIN", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", "SUPER_ADMIN"))
      mockResolveActiveAdminRole.mockResolvedValue("SUPER_ADMIN")

      const session = await requireAdmin()
      expect(session.user.adminRole).toBe("SUPER_ADMIN")
      expect(mockResolveActiveAdminRole).toHaveBeenCalledWith("adm_1", "admin@onestar.com.co")
    })

    it("pasa cuando el rol activo en base de datos es INVENTORY_OPERATOR", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", "INVENTORY_OPERATOR"))
      mockResolveActiveAdminRole.mockResolvedValue("INVENTORY_OPERATOR")

      const session = await requireAdmin()
      expect(session.user.adminRole).toBe("INVENTORY_OPERATOR")
    })

    it("rechaza sin sesión", async () => {
      mockGetSession.mockResolvedValue(null)
      await expect(requireAdmin()).rejects.toThrow(UnauthorizedError)
      expect(mockResolveActiveAdminRole).not.toHaveBeenCalled()
    })

    it("rechaza a un cliente", async () => {
      mockGetSession.mockResolvedValue(sessionWith("customer"))
      await expect(requireAdmin()).rejects.toThrow(UnauthorizedError)
      expect(mockResolveActiveAdminRole).not.toHaveBeenCalled()
    })

    it("falla cerrado y rechaza si el usuario de la sesión no tiene rol válido en base de datos", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", "SUPER_ADMIN"))
      mockResolveActiveAdminRole.mockResolvedValue(null)

      await expect(requireAdmin()).rejects.toThrow(UnauthorizedError)
    })

    it("falla cerrado si la consulta de rol en base de datos falla", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", "SUPER_ADMIN"))
      mockResolveActiveAdminRole.mockResolvedValue(null)

      await expect(requireAdmin()).rejects.toThrow(UnauthorizedError)
    })
  })

  describe("requireSuperAdmin", () => {
    it("pasa con SUPER_ADMIN resuelto por base de datos", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", "SUPER_ADMIN"))
      mockResolveActiveAdminRole.mockResolvedValue("SUPER_ADMIN")

      await expect(requireSuperAdmin()).resolves.toBeDefined()
    })

    it("rechaza a INVENTORY_OPERATOR con mensaje específico", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", "INVENTORY_OPERATOR"))
      mockResolveActiveAdminRole.mockResolvedValue("INVENTORY_OPERATOR")

      await expect(requireSuperAdmin()).rejects.toThrow("Esta acción requiere el rol Super Admin.")
    })

    it("resuelve sesión antigua sin adminRole consultando la base de datos y pasa si es SUPER_ADMIN", async () => {
      // Sesión creada antes del campo (adminRole undefined)
      mockGetSession.mockResolvedValue(sessionWith("admin", undefined))
      mockResolveActiveAdminRole.mockResolvedValue("SUPER_ADMIN")

      const session = await requireSuperAdmin()
      expect(session.user.adminRole).toBe("SUPER_ADMIN")
      expect(mockResolveActiveAdminRole).toHaveBeenCalledWith("adm_1", "admin@onestar.com.co")
    })

    it("resuelve sesión antigua sin adminRole consultando la base de datos y rechaza si es INVENTORY_OPERATOR", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", undefined))
      mockResolveActiveAdminRole.mockResolvedValue("INVENTORY_OPERATOR")

      await expect(requireSuperAdmin()).rejects.toThrow("Esta acción requiere el rol Super Admin.")
    })

    it("resuelve sesión antigua sin adminRole y niega acceso si no existe el usuario en base de datos", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", undefined))
      mockResolveActiveAdminRole.mockResolvedValue(null)

      await expect(requireSuperAdmin()).rejects.toThrow(UnauthorizedError)
    })

    it("refleja el cambio de rol en base de datos sin cerrar la sesión (degradación)", async () => {
      // La cookie de sesión todavía dice "SUPER_ADMIN", pero en base de datos ya fue degradado a "INVENTORY_OPERATOR"
      mockGetSession.mockResolvedValue(sessionWith("admin", "SUPER_ADMIN"))
      mockResolveActiveAdminRole.mockResolvedValue("INVENTORY_OPERATOR")

      await expect(requireSuperAdmin()).rejects.toThrow("Esta acción requiere el rol Super Admin.")
    })

    it("un rol nuevo o no reconocido en base de datos no concede acceso", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", "SUPER_ADMIN"))
      mockResolveActiveAdminRole.mockResolvedValue(null) // nuevo rol normalizado a null

      await expect(requireSuperAdmin()).rejects.toThrow(UnauthorizedError)
    })

    it("rechaza sin sesión de admin", async () => {
      mockGetSession.mockResolvedValue(null)
      await expect(requireSuperAdmin()).rejects.toThrow(UnauthorizedError)
    })
  })

  describe("getAdminRole", () => {
    it("devuelve INVENTORY_OPERATOR cuando la base de datos lo indica", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", "SUPER_ADMIN"))
      mockResolveActiveAdminRole.mockResolvedValue("INVENTORY_OPERATOR")

      expect(await getAdminRole()).toBe("INVENTORY_OPERATOR")
    })

    it("devuelve SUPER_ADMIN cuando la base de datos lo indica", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", null))
      mockResolveActiveAdminRole.mockResolvedValue("SUPER_ADMIN")

      expect(await getAdminRole()).toBe("SUPER_ADMIN")
    })

    it("devuelve null cuando la base de datos no encuentra rol válido", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", null))
      mockResolveActiveAdminRole.mockResolvedValue(null)

      expect(await getAdminRole()).toBeNull()
    })

    it("devuelve null sin sesión de admin", async () => {
      mockGetSession.mockResolvedValue(null)
      expect(await getAdminRole()).toBeNull()
    })
  })

  describe("getAdminSession", () => {
    it("devuelve la sesión con el rol activo cuando el rol es válido", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", "SUPER_ADMIN"))
      mockResolveActiveAdminRole.mockResolvedValue("INVENTORY_OPERATOR")

      const session = await getAdminSession()
      expect(session).toBeDefined()
      expect(session?.user.adminRole).toBe("INVENTORY_OPERATOR")
    })

    it("devuelve null si el rol resuelto es null", async () => {
      mockGetSession.mockResolvedValue(sessionWith("admin", "SUPER_ADMIN"))
      mockResolveActiveAdminRole.mockResolvedValue(null)

      expect(await getAdminSession()).toBeNull()
    })

    it("devuelve null sin sesión o si no es admin", async () => {
      mockGetSession.mockResolvedValue(sessionWith("customer"))
      expect(await getAdminSession()).toBeNull()
    })
  })
})
