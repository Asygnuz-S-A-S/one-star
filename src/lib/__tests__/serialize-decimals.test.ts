import { describe, expect, it } from "vitest"
import { Prisma } from "@prisma/client"

import { serializeDecimals } from "../serialize-decimals"

describe("serializeDecimals", () => {
  it("convierte un Decimal de primer nivel a number", () => {
    // Arrange
    const product = { basePrice: new Prisma.Decimal("529900.00"), salePrice: null }

    // Act
    const result = serializeDecimals(product)

    // Assert
    expect(result).toEqual({ basePrice: 529900, salePrice: null })
    expect(typeof result.basePrice).toBe("number")
  })

  it("convierte Decimals anidados en arreglos y objetos", () => {
    // Arrange
    const product = {
      crossSells: [{ id: "a", basePrice: new Prisma.Decimal(10) }],
      colorFamily: { products: [{ id: "b", basePrice: new Prisma.Decimal("19.5") }] },
    }

    // Act
    const result = serializeDecimals(product)

    // Assert
    expect(result.crossSells[0].basePrice).toBe(10)
    expect(result.colorFamily.products[0].basePrice).toBe(19.5)
  })

  it("conserva fechas, strings, booleanos y null sin tocarlos", () => {
    // Arrange
    const createdAt = new Date("2026-09-09T00:00:00Z")
    const product = { createdAt, name: "Tenis", isPublished: true, brand: null }

    // Act
    const result = serializeDecimals(product)

    // Assert
    expect(result.createdAt).toBe(createdAt)
    expect(result).toEqual(product)
  })

  it("no muta el objeto original", () => {
    // Arrange
    const original = { basePrice: new Prisma.Decimal(5), variants: [{ stock: 1 }] }

    // Act
    const result = serializeDecimals(original)

    // Assert
    expect(Prisma.Decimal.isDecimal(original.basePrice)).toBe(true)
    expect(result).not.toBe(original)
    expect(result.variants).not.toBe(original.variants)
  })

  it("devuelve null tal cual cuando el producto no existe", () => {
    expect(serializeDecimals(null)).toBeNull()
  })
})
