import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { planErpColorFamilies } from "../erp-color-family.plan"

describe("planErpColorFamilies", () => {
  it("crea una familia con productos libres de colores distintos", () => {
    const plan = planErpColorFamilies([
      {
        id: "maui-beige",
        erpColorFamilyKey: "loggro:013:MAUI",
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["Beige"],
        eligible: true,
      },
      {
        id: "maui-negro",
        erpColorFamilyKey: "loggro:013:MAUI",
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["Negro"],
        eligible: true,
      },
    ])

    expect(plan.actions).toEqual([
      {
        mode: "create",
        key: "loggro:013:MAUI",
        familyId: null,
        memberIds: ["maui-beige", "maui-negro"],
      },
    ])
  })

  it("omite el grupo completo si un candidato pertenece a una familia manual", () => {
    const plan = planErpColorFamilies([
      {
        id: "manual",
        erpColorFamilyKey: "loggro:004:180361",
        colorFamilyId: "family-manual",
        colorFamilyErpKey: null,
        colors: ["Negro"],
        eligible: true,
      },
      {
        id: "free",
        erpColorFamilyKey: "loggro:004:180361",
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["Verde"],
        eligible: true,
      },
    ])

    expect(plan.actions).toEqual([])
    expect(plan.omissions).toEqual([
      {
        key: "loggro:004:180361",
        reason: "MANUAL_FAMILY",
        productIds: ["manual", "free"],
      },
    ])
  })

  it("diagnostica y omite grupos con un miembro sin color real", () => {
    const plan = planErpColorFamilies([
      {
        id: "valid",
        erpColorFamilyKey: "loggro:006:3ME3011",
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["Beige"],
        eligible: true,
      },
      {
        id: "invalid",
        erpColorFamilyKey: "loggro:006:3ME3011",
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["Sin color", ""],
        eligible: true,
      },
    ])

    expect(plan.omissions[0]).toEqual({
      key: "loggro:006:3ME3011",
      reason: "INVALID_COLOR",
      productIds: ["invalid"],
    })
  })

  it("rechaza colores duplicados ignorando acentos y mayúsculas", () => {
    const plan = planErpColorFamilies([
      {
        id: "cafe-1",
        erpColorFamilyKey: "loggro:004:125645",
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["Café"],
        eligible: true,
      },
      {
        id: "cafe-2",
        erpColorFamilyKey: "loggro:004:125645",
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["cafe"],
        eligible: true,
      },
    ])

    expect(plan.omissions[0]?.reason).toBe("DUPLICATE_COLOR")
    expect(plan.actions).toEqual([])
  })

  it("adhiere solo un producto elegible a una familia automática existente", () => {
    const plan = planErpColorFamilies([
      {
        id: "existing",
        erpColorFamilyKey: "loggro:003:VN000D22",
        colorFamilyId: "family-auto",
        colorFamilyErpKey: "loggro:003:VN000D22",
        colors: ["Negro"],
        eligible: false,
      },
      {
        id: "new",
        erpColorFamilyKey: "loggro:003:VN000D22",
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["Blanco"],
        eligible: true,
      },
      {
        id: "manually-excluded",
        erpColorFamilyKey: "loggro:003:VN000D22",
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["Vino"],
        eligible: false,
      },
    ])

    expect(plan.actions).toEqual([
      {
        mode: "add",
        key: "loggro:003:VN000D22",
        familyId: "family-auto",
        memberIds: ["new"],
      },
    ])
  })

  it("omite un producto cuyas variantes contienen más de un color real", () => {
    const plan = planErpColorFamilies([
      {
        id: "ambiguous",
        erpColorFamilyKey: "loggro:013:MAUI",
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["Negro", "Blanco"],
        eligible: true,
      },
      {
        id: "green",
        erpColorFamilyKey: "loggro:013:MAUI",
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["Verde"],
        eligible: true,
      },
    ])

    expect(plan.actions).toEqual([])
    expect(plan.omissions[0]).toEqual({
      key: "loggro:013:MAUI",
      reason: "INVALID_COLOR",
      productIds: ["ambiguous"],
    })
  })
})
