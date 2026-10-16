import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  BRAND_ALIASES,
  GENDER_ALIASES,
  isSkippedBrand,
  productImportRowSchema,
  resolveBrandAlias,
  SKIPPED_BRANDS,
  validateAndNormalizeSize,
} from "../product-import.validator"

describe("validateAndNormalizeSize", () => {
  it("normaliza tallas enteras y decimales eliminando ceros redundantes", () => {
    expect(validateAndNormalizeSize("7.0")).toEqual({ valid: true, size: "7", recoveredFromDate: false })
    expect(validateAndNormalizeSize("7")).toEqual({ valid: true, size: "7", recoveredFromDate: false })
    expect(validateAndNormalizeSize("4.50")).toEqual({ valid: true, size: "4.5", recoveredFromDate: false })
    expect(validateAndNormalizeSize("4,5")).toEqual({ valid: true, size: "4.5", recoveredFromDate: false })
  })

  it("acepta tallas con sufijo I, J o B", () => {
    expect(validateAndNormalizeSize("7I")).toEqual({ valid: true, size: "7I", recoveredFromDate: false })
    expect(validateAndNormalizeSize("7.0I")).toEqual({ valid: true, size: "7I", recoveredFromDate: false })
    expect(validateAndNormalizeSize("12J")).toEqual({ valid: true, size: "12J", recoveredFromDate: false })
    expect(validateAndNormalizeSize("5B")).toEqual({ valid: true, size: "5B", recoveredFromDate: false })
  })

  it("acepta U y Única", () => {
    expect(validateAndNormalizeSize("U")).toEqual({ valid: true, size: "U", recoveredFromDate: false })
    expect(validateAndNormalizeSize("u")).toEqual({ valid: true, size: "U", recoveredFromDate: false })
    expect(validateAndNormalizeSize("Única")).toEqual({ valid: true, size: "Única", recoveredFromDate: false })
    expect(validateAndNormalizeSize("UNICA")).toEqual({ valid: true, size: "Única", recoveredFromDate: false })
  })

  it("recupera tallas guardadas como fecha de Excel cuando el mes es 5 y día entre 1 y 13", () => {
    // 8 de mayo de 2026 -> 8.5
    const dateMay8 = new Date(Date.UTC(2026, 4, 8, 12, 0, 0))
    const result = validateAndNormalizeSize(dateMay8)
    expect(result).toEqual({ valid: true, size: "8.5", recoveredFromDate: true })
  })

  it("recupera fechas con formato de celda d.m", () => {
    const date = new Date(Date.UTC(2026, 4, 4, 12, 0, 0))
    const result = validateAndNormalizeSize(date, { z: "d.m", t: "d" })
    expect(result).toEqual({ valid: true, size: "4.5", recoveredFromDate: true })
  })

  it("rechaza fechas que no corresponden a medias tallas válidas", () => {
    const dateOct20 = new Date(Date.UTC(2026, 9, 20, 12, 0, 0))
    const result = validateAndNormalizeSize(dateOct20)
    expect(result.valid).toBe(false)
    expect(result.error).toBe("Talla inválida")
  })

  it("rechaza valores que no son tallas válidas", () => {
    const result = validateAndNormalizeSize("XL")
    expect(result.valid).toBe(false)
    expect(result.error).toContain("¿Excel la convirtió en fecha?")
  })

  it("rechaza tallas con decimales no válidos para calzado", () => {
    const result = validateAndNormalizeSize("7.8")
    expect(result.valid).toBe(false)
    expect(result.error).toContain("¿Excel la convirtió en fecha?")
  })

  it("rechaza tallas vacías", () => {
    expect(validateAndNormalizeSize("")).toEqual({ valid: false, error: "Talla vacía" })
  })
})

describe("BRAND_ALIASES y resolveBrandAlias", () => {
  it("mapea ONCLOUD a On", () => {
    expect(resolveBrandAlias("ONCLOUD")).toBe("On")
    expect(resolveBrandAlias("on cloud")).toBe("On")
    expect(BRAND_ALIASES["ONCLOUD"]).toBe("On")
  })

  it("mapea ACESSORIOS VANS a Accesorios Vans", () => {
    expect(resolveBrandAlias("ACESSORIOS VANS")).toBe("Accesorios Vans")
    expect(resolveBrandAlias("acessorios vans")).toBe("Accesorios Vans")
  })

  it("mantiene marcas no mapeadas sin cambios", () => {
    expect(resolveBrandAlias("Nike")).toBe("Nike")
    expect(resolveBrandAlias("Converse")).toBe("Converse")
  })
})

describe("SKIPPED_BRANDS y isSkippedBrand", () => {
  it("reconoce marcas a omitir ignorando mayúsculas y tildes", () => {
    expect(isSkippedBrand("BOLSAS DE VENTA")).toBe(true)
    expect(isSkippedBrand("bolsas de venta")).toBe(true)
    expect(isSkippedBrand("BONO")).toBe(true)
    expect(isSkippedBrand("bono")).toBe(true)
    expect(isSkippedBrand("FALTA ORGANIZAR ESTA REFERENCIA")).toBe(true)
    expect(SKIPPED_BRANDS).toContain("BOLSAS DE VENTA")
  })

  it("no omite marcas reales", () => {
    expect(isSkippedBrand("Nike")).toBe(false)
    expect(isSkippedBrand("Vans")).toBe(false)
  })
})

describe("productImportRowSchema y alias de género", () => {
  const validBase = {
    sku: "TEST-1",
    name: "Zapatilla",
    brandName: "Nike",
    categoryName: "Calzado",
    gender: "HOMBRE",
    price: 100000,
    size: "40",
    color: "Blanco",
    stock: 5,
  }

  it("mapea NIÑO y NIÑOS a NINO", () => {
    expect(GENDER_ALIASES["NIÑO"]).toBe("NINO")
    expect(GENDER_ALIASES["NIÑOS"]).toBe("NINO")
    const res = productImportRowSchema.safeParse({ ...validBase, gender: "NIÑOS" })
    expect(res.success).toBe(true)
    if (res.success) expect(res.data.gender).toBe("NINO")
  })

  it("mapea NIÑA y NIÑAS a NINA", () => {
    expect(GENDER_ALIASES["NIÑA"]).toBe("NINA")
    expect(GENDER_ALIASES["NIÑAS"]).toBe("NINA")
    const res = productImportRowSchema.safeParse({ ...validBase, gender: "NIÑA" })
    expect(res.success).toBe(true)
    if (res.success) expect(res.data.gender).toBe("NINA")
  })

  it("mapea BEBÉ a BEBE", () => {
    expect(GENDER_ALIASES["BEBÉ"]).toBe("BEBE")
    const res = productImportRowSchema.safeParse({ ...validBase, gender: "BEBÉ" })
    expect(res.success).toBe(true)
    if (res.success) expect(res.data.gender).toBe("BEBE")
  })

  it("rechaza género desconocido con lista de valores permitidos", () => {
    const res = productImportRowSchema.safeParse({ ...validBase, gender: "OTRO" })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("Valores permitidos")
    }
  })

  it("soporta hasta 8 imágenes y photosFolderUrl", () => {
    const res = productImportRowSchema.safeParse({
      ...validBase,
      image1: "https://ejemplo.com/1.jpg",
      image2: "https://ejemplo.com/2.jpg",
      image3: "https://ejemplo.com/3.jpg",
      image4: "https://ejemplo.com/4.jpg",
      image5: "https://ejemplo.com/5.jpg",
      image6: "https://ejemplo.com/6.jpg",
      image7: "https://ejemplo.com/7.jpg",
      image8: "https://ejemplo.com/8.jpg",
      photosFolderUrl: "https://drive.google.com/drive/folders/xyz123",
      readyFlag: "OK",
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.image8).toBe("https://ejemplo.com/8.jpg")
      expect(res.data.photosFolderUrl).toBe("https://drive.google.com/drive/folders/xyz123")
      expect(res.data.readyFlag).toBe("OK")
    }
  })
})
