import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mockFindAdminRoleByIdOrEmail = vi.hoisted(() => vi.fn())
vi.mock("@/server/repositories/admin.repository", () => ({
  findAdminRoleByIdOrEmail: mockFindAdminRoleByIdOrEmail,
}))

const mockDeleteMany = vi.hoisted(() => vi.fn())
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    authSession: {
      deleteMany: mockDeleteMany,
    },
  },
}))

import {
  resolveActiveAdminRole,
  invalidateAdminRoleCache,
  revokeAdminSessionByToken,
  ADMIN_ROLE_CACHE_TTL_MS,
} from "../admin-role.service"

describe("admin-role.service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateAdminRoleCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("resolveActiveAdminRole", () => {
    it("resuelve el rol activo consultando el repositorio y normalizándolo", async () => {
      mockFindAdminRoleByIdOrEmail.mockResolvedValue("SUPER_ADMIN")

      const role = await resolveActiveAdminRole("adm_1", "admin@onestar.com.co")

      expect(role).toBe("SUPER_ADMIN")
      expect(mockFindAdminRoleByIdOrEmail).toHaveBeenCalledWith("adm_1", "admin@onestar.com.co")
    })

    it("utiliza la caché en memoria dentro de los 60 segundos", async () => {
      mockFindAdminRoleByIdOrEmail.mockResolvedValue("SUPER_ADMIN")

      await resolveActiveAdminRole("adm_1", "admin@onestar.com.co")
      await resolveActiveAdminRole("adm_1", "admin@onestar.com.co")
      await resolveActiveAdminRole("adm_1", "admin@onestar.com.co")

      expect(mockFindAdminRoleByIdOrEmail).toHaveBeenCalledTimes(1)
    })

    it("refleja el cambio de rol en base de datos al expirar la caché de 60 segundos sin necesidad de nuevo login", async () => {
      mockFindAdminRoleByIdOrEmail.mockResolvedValue("SUPER_ADMIN")

      const initialRole = await resolveActiveAdminRole("adm_1", "admin@onestar.com.co")
      expect(initialRole).toBe("SUPER_ADMIN")

      // El usuario es degradado en base de datos a INVENTORY_OPERATOR
      mockFindAdminRoleByIdOrEmail.mockResolvedValue("INVENTORY_OPERATOR")

      // Dentro de los 60s aún usa la caché
      vi.advanceTimersByTime(30 * 1000)
      expect(await resolveActiveAdminRole("adm_1", "admin@onestar.com.co")).toBe("SUPER_ADMIN")
      expect(mockFindAdminRoleByIdOrEmail).toHaveBeenCalledTimes(1)

      // Pasados 60s, la caché expira y lee el nuevo rol de inmediato
      vi.advanceTimersByTime(31 * 1000)
      const updatedRole = await resolveActiveAdminRole("adm_1", "admin@onestar.com.co")
      expect(updatedRole).toBe("INVENTORY_OPERATOR")
      expect(mockFindAdminRoleByIdOrEmail).toHaveBeenCalledTimes(2)
    })

    it("refleja el cambio de rol de inmediato si se invalida la caché explícitamente", async () => {
      mockFindAdminRoleByIdOrEmail.mockResolvedValue("SUPER_ADMIN")
      await resolveActiveAdminRole("adm_1", "admin@onestar.com.co")

      mockFindAdminRoleByIdOrEmail.mockResolvedValue("INVENTORY_OPERATOR")
      invalidateAdminRoleCache("adm_1")

      const updatedRole = await resolveActiveAdminRole("adm_1", "admin@onestar.com.co")
      expect(updatedRole).toBe("INVENTORY_OPERATOR")
      expect(mockFindAdminRoleByIdOrEmail).toHaveBeenCalledTimes(2)
    })

    it("falla cerrado y devuelve null si el usuario no existe en la base de datos", async () => {
      mockFindAdminRoleByIdOrEmail.mockResolvedValue(null)

      const role = await resolveActiveAdminRole("adm_nonexistent", "unknown@onestar.com.co")
      expect(role).toBeNull()
    })

    it("falla cerrado y devuelve null si la consulta a la base de datos falla o lanza error", async () => {
      mockFindAdminRoleByIdOrEmail.mockRejectedValue(new Error("Database connection error"))

      const role = await resolveActiveAdminRole("adm_error", "err@onestar.com.co")
      expect(role).toBeNull()
    })

    it("falla cerrado y devuelve null ante roles desconocidos o con formato incorrecto en base de datos", async () => {
      for (const invalidRole of ["MODERATOR", "super_admin", "ADMIN", "", "CUSTOM_ROLE"]) {
        mockFindAdminRoleByIdOrEmail.mockResolvedValue(invalidRole)
        invalidateAdminRoleCache()

        const role = await resolveActiveAdminRole("adm_invalid", "test@onestar.com.co")
        expect(role, `Rol '${invalidRole}' debe resolver a null`).toBeNull()
      }
    })

    it("devuelve null de inmediato si no se suministra userId ni email", async () => {
      expect(await resolveActiveAdminRole("", "")).toBeNull()
      expect(await resolveActiveAdminRole(null, undefined)).toBeNull()
      expect(mockFindAdminRoleByIdOrEmail).not.toHaveBeenCalled()
    })

    it("asegura que el TTL de la caché no sea mayor a 60 segundos", () => {
      expect(ADMIN_ROLE_CACHE_TTL_MS).toBeLessThanOrEqual(60 * 1000)
    })
  })

  describe("revokeAdminSessionByToken", () => {
    it("elimina las sesiones en base de datos correspondientes al token", async () => {
      mockDeleteMany.mockResolvedValue({ count: 1 })

      await revokeAdminSessionByToken("token_123")

      expect(mockDeleteMany).toHaveBeenCalledWith({ where: { token: "token_123" } })
    })

    it("ignora errores si la base de datos falla al revocar la sesión", async () => {
      mockDeleteMany.mockRejectedValue(new Error("DB unreachable"))

      await expect(revokeAdminSessionByToken("token_123")).resolves.not.toThrow()
    })

    it("no ejecuta consulta si el token está vacío", async () => {
      await revokeAdminSessionByToken("")
      expect(mockDeleteMany).not.toHaveBeenCalled()
    })
  })
})
