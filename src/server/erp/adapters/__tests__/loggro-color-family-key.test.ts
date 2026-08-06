import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { deriveLoggroColorFamilyKey } from "../loggro-color-family-key"

describe("deriveLoggroColorFamilyKey", () => {
  it("separa el sufijo de color de un código Skechers", () => {
    expect(
      deriveLoggroColorFamilyKey({ brandCode: "004", sku: "180361BKNT" })
    ).toBe("loggro:004:180361")
  })

  it("separa los cuatro caracteres de color de un código On", () => {
    expect(
      deriveLoggroColorFamilyKey({ brandCode: "006", sku: "3ME30113323" })
    ).toBe("loggro:006:3ME3011")
  })

  it("conserva el modelo numérico anterior al guion en Hoka", () => {
    expect(
      deriveLoggroColorFamilyKey({ brandCode: "007", sku: "1162011-BWHT" })
    ).toBe("loggro:007:1162011")
  })

  it("separa el sufijo de color de Vans calzado", () => {
    expect(
      deriveLoggroColorFamilyKey({ brandCode: "003", sku: "VN000D22ZCFP" })
    ).toBe("loggro:003:VN000D22")
  })

  it("usa la misma regla estructural con namespace propio para Vans ropa", () => {
    expect(
      deriveLoggroColorFamilyKey({ brandCode: "010", sku: "VN0A3UP4BLK" })
    ).toBe("loggro:010:VN0A3UP4")
  })

  it("conserva el nombre de modelo anterior al bloque de talla/color en Discovery", () => {
    expect(
      deriveLoggroColorFamilyKey({ brandCode: "013", sku: "MAUI-245VE" })
    ).toBe("loggro:013:MAUI")
  })

  it("separa el color numérico de un código Nike con guion", () => {
    expect(
      deriveLoggroColorFamilyKey({ brandCode: "002", sku: "HM6803-101" })
    ).toBe("loggro:002:HM6803")
  })

  it("reconoce ropa codificada sin aceptar texto libre", () => {
    expect(
      deriveLoggroColorFamilyKey({ brandCode: "008", sku: "10018568-A04" })
    ).toBe("loggro:008:10018568")
  })

  it("deja sin clave marcas y prefijos ambiguos", () => {
    expect(deriveLoggroColorFamilyKey({ brandCode: "008", sku: "RV8-DEO" })).toBeUndefined()
    expect(deriveLoggroColorFamilyKey({ brandCode: "001", sku: "M7650C" })).toBeUndefined()
    expect(deriveLoggroColorFamilyKey({ brandCode: "005", sku: "U9060BLK" })).toBeUndefined()
    expect(deriveLoggroColorFamilyKey({ brandCode: "013", sku: "MAUI" })).toBeUndefined()
  })
})
