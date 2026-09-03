import { describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))
import {
  buildVisibleProductPage,
  normalizeColorFamilyMemberIds,
  planProductColorFamilyUpdate,
} from "../product-color-family.plan"

describe("normalizeColorFamilyMemberIds", () => {
  test("incluye el producto actual una sola vez y elimina IDs repetidos", () => {
    expect(
      normalizeColorFamilyMemberIds("product-a", [
        "product-b",
        "product-a",
        "product-b",
        "product-c",
      ])
    ).toEqual(["product-a", "product-b", "product-c"])
  })
})

describe("planProductColorFamilyUpdate", () => {
  test("rechaza un producto que ya pertenece a otra familia", () => {
    expect(
      planProductColorFamilyUpdate({
        productId: "product-a",
        currentFamilyId: "family-1",
        requestedMemberIds: ["product-b"],
        products: [
          { id: "product-a", colorFamilyId: "family-1" },
          { id: "product-b", colorFamilyId: "family-2" },
        ],
      })
    ).toEqual({
      success: false,
      error: {
        code: "FOREIGN_FAMILY",
        productId: "product-b",
      },
    })
  })

  test("crea una familia cuando todos los productos están libres", () => {
    expect(
      planProductColorFamilyUpdate({
        productId: "product-a",
        currentFamilyId: null,
        requestedMemberIds: ["product-b"],
        products: [
          { id: "product-a", colorFamilyId: null },
          { id: "product-b", colorFamilyId: null },
        ],
      })
    ).toEqual({
      success: true,
      mode: "create",
      familyId: null,
      memberIds: ["product-a", "product-b"],
    })
  })

  test("disuelve la familia cuando solo queda el producto actual", () => {
    expect(
      planProductColorFamilyUpdate({
        productId: "product-a",
        currentFamilyId: "family-1",
        requestedMemberIds: [],
        products: [{ id: "product-a", colorFamilyId: "family-1" }],
      })
    ).toEqual({
      success: true,
      mode: "dissolve",
      familyId: "family-1",
      memberIds: ["product-a"],
    })
  })

  test("rechaza miembros sin un color real", () => {
    expect(
      planProductColorFamilyUpdate({
        productId: "product-a",
        currentFamilyId: null,
        requestedMemberIds: ["product-b"],
        products: [
          { id: "product-a", colorFamilyId: null, colors: ["Negro"] },
          { id: "product-b", colorFamilyId: null, colors: ["Sin color", ""] },
        ],
      })
    ).toEqual({
      success: false,
      error: { code: "INVALID_COLOR", productId: "product-b" },
    })
  })

  test("rechaza dos productos que representan el mismo color", () => {
    expect(
      planProductColorFamilyUpdate({
        productId: "product-a",
        currentFamilyId: null,
        requestedMemberIds: ["product-b"],
        products: [
          { id: "product-a", colorFamilyId: null, colors: ["Café"] },
          { id: "product-b", colorFamilyId: null, colors: ["cafe"] },
        ],
      })
    ).toEqual({
      success: false,
      error: { code: "DUPLICATE_COLOR", productId: "product-b" },
    })
  })

  test("rechaza un producto cuyas variantes representan más de un color", () => {
    expect(
      planProductColorFamilyUpdate({
        productId: "product-a",
        currentFamilyId: null,
        requestedMemberIds: ["product-b"],
        products: [
          { id: "product-a", colorFamilyId: null, colors: ["Negro", "Blanco"] },
          { id: "product-b", colorFamilyId: null, colors: ["Verde"] },
        ],
      })
    ).toEqual({
      success: false,
      error: { code: "INVALID_COLOR", productId: "product-a" },
    })
  })

  test("no modifica una familia cuando la membresía solicitada no cambió", () => {
    expect(
      planProductColorFamilyUpdate({
        productId: "product-a",
        currentFamilyId: "family-1",
        currentMemberIds: ["product-a", "product-b"],
        expectedCurrentMemberIds: ["product-b", "product-a"],
        requestedMemberIds: ["product-b"],
        products: [
          { id: "product-a", colorFamilyId: "family-1", colors: ["Negro"] },
          { id: "product-b", colorFamilyId: "family-1", colors: ["Blanco"] },
        ],
      })
    ).toEqual({
      success: true,
      mode: "none",
      familyId: "family-1",
      memberIds: ["product-a", "product-b"],
    })
  })

  test("rechaza un formulario obsoleto si la membresía cambió mientras estaba abierto", () => {
    expect(
      planProductColorFamilyUpdate({
        productId: "product-a",
        currentFamilyId: "family-1",
        currentMemberIds: ["product-a", "product-b", "product-c"],
        expectedCurrentMemberIds: ["product-a", "product-b"],
        requestedMemberIds: ["product-b"],
        products: [
          { id: "product-a", colorFamilyId: "family-1", colors: ["Negro"] },
          { id: "product-b", colorFamilyId: "family-1", colors: ["Blanco"] },
        ],
      })
    ).toEqual({
      success: false,
      error: { code: "STALE_FAMILY", productId: "product-a" },
    })
  })
})

describe("buildVisibleProductPage", () => {
  test("cuenta una familia como una tarjeta y conserva los productos sueltos", () => {
    const result = buildVisibleProductPage(
      [
        { id: "family-a", colorFamilyId: "family-1" },
        { id: "family-b", colorFamilyId: "family-1" },
        { id: "loose-a", colorFamilyId: null },
        { id: "loose-b", colorFamilyId: null },
      ],
      1,
      24
    )

    expect(result).toEqual({
      productIds: ["family-a", "loose-a", "loose-b"],
      total: 3,
    })
  })

  test("pagina después de colapsar las familias", () => {
    const result = buildVisibleProductPage(
      [
        { id: "family-a", colorFamilyId: "family-1" },
        { id: "family-b", colorFamilyId: "family-1" },
        { id: "loose-a", colorFamilyId: null },
        { id: "loose-b", colorFamilyId: null },
      ],
      2,
      2
    )

    expect(result).toEqual({ productIds: ["loose-b"], total: 3 })
  })

  test("normaliza páginas no numéricas o infinitas", () => {
    const candidates = [{ id: "product-a", colorFamilyId: null }]

    expect(buildVisibleProductPage(candidates, Number.NaN, 24).productIds).toEqual(["product-a"])
    expect(buildVisibleProductPage(candidates, Number.POSITIVE_INFINITY, 24).productIds).toEqual([
      "product-a",
    ])
  })
})
