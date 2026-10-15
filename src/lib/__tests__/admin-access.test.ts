import { describe, expect, it } from "vitest"
import { canAccessAdminPath, normalizeAdminRole } from "@/lib/admin-access"

describe("canAccessAdminPath", () => {
  it("SUPER_ADMIN entra a todo", () => {
    expect(canAccessAdminPath("SUPER_ADMIN", "/admin/cupones")).toBe(true)
    expect(canAccessAdminPath("SUPER_ADMIN", "/admin/clientes/abc")).toBe(true)
  })

  it("INVENTORY_OPERATOR entra a inventario, pedidos y sus subrutas", () => {
    for (const p of [
      "/admin",
      "/admin/pedidos",
      "/admin/pedidos/ped_1",
      "/admin/productos",
      "/admin/productos/importar",
      "/admin/productos/abc/editar",
      "/admin/categorias",
      "/admin/marcas",
      "/admin/colores/",
    ]) {
      expect(canAccessAdminPath("INVENTORY_OPERATOR", p), p).toBe(true)
    }
  })

  it("INVENTORY_OPERATOR no entra a lo demás, incluidas páginas nuevas", () => {
    for (const p of [
      "/admin/cupones",
      "/admin/clientes",
      "/admin/clientes/abc",
      "/admin/archivos",
      "/admin/tiendas",
      "/admin/tarjetas-regalo",
      "/admin/integraciones/conectar-erp",
      "/admin/pagina-futura",
      "/admin/productosx",
    ]) {
      expect(canAccessAdminPath("INVENTORY_OPERATOR", p), p).toBe(false)
    }
  })

  it("deniega acceso a cualquier ruta si el rol es null o undefined", () => {
    for (const role of [null, undefined]) {
      for (const p of ["/admin", "/admin/pedidos", "/admin/productos", "/admin/cupones"]) {
        expect(canAccessAdminPath(role, p), `${role} -> ${p}`).toBe(false)
      }
    }
  })

  it("deniega acceso a cualquier ruta si el rol es desconocido o no normalizado", () => {
    for (const role of ["MODERATOR", "super_admin", "admin", "SUPPORT", ""] as never[]) {
      for (const p of ["/admin", "/admin/pedidos", "/admin/productos", "/admin/cupones"]) {
        expect(canAccessAdminPath(role, p), `${role} -> ${p}`).toBe(false)
      }
    }
  })
})

describe("normalizeAdminRole", () => {
  it("devuelve los roles de admin conocidos cuando coinciden exactamente", () => {
    expect(normalizeAdminRole("SUPER_ADMIN")).toBe("SUPER_ADMIN")
    expect(normalizeAdminRole("INVENTORY_OPERATOR")).toBe("INVENTORY_OPERATOR")
  })

  it("falla cerrado y devuelve null para valores nulos, indefinidos o vacíos", () => {
    expect(normalizeAdminRole(null)).toBeNull()
    expect(normalizeAdminRole(undefined)).toBeNull()
    expect(normalizeAdminRole("")).toBeNull()
    expect(normalizeAdminRole("   ")).toBeNull()
  })

  it("falla cerrado ante mayúsculas/minúsculas incorrectas", () => {
    expect(normalizeAdminRole("super_admin")).toBeNull()
    expect(normalizeAdminRole("Super_Admin")).toBeNull()
    expect(normalizeAdminRole("inventory_operator")).toBeNull()
    expect(normalizeAdminRole("Inventory_Operator")).toBeNull()
    expect(normalizeAdminRole("SUPERADMIN")).toBeNull()
  })

  it("falla cerrado y no concede acceso ante roles desconocidos o nuevos", () => {
    expect(normalizeAdminRole("MODERATOR")).toBeNull()
    expect(normalizeAdminRole("ADMIN")).toBeNull()
    expect(normalizeAdminRole("SUPPORT_AGENT")).toBeNull()
    expect(normalizeAdminRole("FINANCE")).toBeNull()
    expect(normalizeAdminRole("CUSTOMER")).toBeNull()
    expect(normalizeAdminRole("unknown_role")).toBeNull()
  })
})
