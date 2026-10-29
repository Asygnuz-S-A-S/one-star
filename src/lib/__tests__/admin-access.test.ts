import { describe, expect, it } from "vitest"
import { canAccessAdminPath, normalizeAdminRole, roleCanAccessArea } from "@/lib/admin-access"

describe("canAccessAdminPath", () => {
  it("SUPER_ADMIN entra a todo", () => {
    expect(canAccessAdminPath("SUPER_ADMIN", "/admin/cupones")).toBe(true)
    expect(canAccessAdminPath("SUPER_ADMIN", "/admin/clientes/abc")).toBe(true)
  })

  it("INVENTORY_OPERATOR entra solo al catálogo y sus subrutas", () => {
    for (const p of [
      "/admin",
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
      "/admin/pedidos",
      "/admin/pedidos/ped_1",
      "/admin/leads",
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

  it("SALES_OPERATOR entra solo a pedidos, clientes, leads y pqrs", () => {
    for (const p of ["/admin", "/admin/cuenta", "/admin/pedidos", "/admin/pedidos/ped_1", "/admin/clientes", "/admin/clientes/abc", "/admin/leads", "/admin/pqrs"]) {
      expect(canAccessAdminPath("SALES_OPERATOR", p), p).toBe(true)
    }
  })

  it("SALES_OPERATOR no entra a catálogo, configuración ni páginas nuevas", () => {
    for (const p of [
      "/admin/productos",
      "/admin/productos/importar",
      "/admin/categorias",
      "/admin/marcas",
      "/admin/colores",
      "/admin/cupones",
      "/admin/usuarios",
      "/admin/configuracion",
      "/admin/pagina-futura",
      "/admin/leadsx",
    ]) {
      expect(canAccessAdminPath("SALES_OPERATOR", p), p).toBe(false)
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

describe("roleCanAccessArea", () => {
  it("SUPER_ADMIN accede a todas las áreas", () => {
    for (const area of ["inventory", "sales", "superadmin"] as const) {
      expect(roleCanAccessArea("SUPER_ADMIN", area), area).toBe(true)
    }
  })

  it("INVENTORY_OPERATOR solo inventario", () => {
    expect(roleCanAccessArea("INVENTORY_OPERATOR", "inventory")).toBe(true)
    expect(roleCanAccessArea("INVENTORY_OPERATOR", "sales")).toBe(false)
    expect(roleCanAccessArea("INVENTORY_OPERATOR", "superadmin")).toBe(false)
  })

  it("SALES_OPERATOR solo ventas", () => {
    expect(roleCanAccessArea("SALES_OPERATOR", "sales")).toBe(true)
    expect(roleCanAccessArea("SALES_OPERATOR", "inventory")).toBe(false)
    expect(roleCanAccessArea("SALES_OPERATOR", "superadmin")).toBe(false)
  })

  it("falla cerrado con rol nulo o desconocido", () => {
    for (const role of [null, undefined, "MODERATOR", ""] as never[]) {
      for (const area of ["inventory", "sales", "superadmin"] as const) {
        expect(roleCanAccessArea(role, area), `${role} -> ${area}`).toBe(false)
      }
    }
  })
})

describe("normalizeAdminRole", () => {
  it("devuelve los roles de admin conocidos cuando coinciden exactamente", () => {
    expect(normalizeAdminRole("SUPER_ADMIN")).toBe("SUPER_ADMIN")
    expect(normalizeAdminRole("INVENTORY_OPERATOR")).toBe("INVENTORY_OPERATOR")
    expect(normalizeAdminRole("SALES_OPERATOR")).toBe("SALES_OPERATOR")
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
