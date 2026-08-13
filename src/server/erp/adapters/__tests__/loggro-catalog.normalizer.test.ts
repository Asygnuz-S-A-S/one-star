import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { normalizeLoggroCatalog } from "../loggro-catalog.normalizer"
import type { LoggroCatalogItem } from "../loggro.client"

describe("normalizeLoggroCatalog", () => {
  it("expone una sugerencia de marca normalizada sin filtrar códigos Loggro al core", () => {
    const snapshot = normalizeLoggroCatalog(
      [
        {
          uuid: "parent-columbia",
          codigo: "TEE-COL",
          descripcion: "CAMISETA COLUMBIA TEMPORADA LOGO AZUL HOMBRE",
          definicion: true,
          codigoCategoria: "008",
        },
        {
          uuid: "variant-columbia",
          codigo: "TEE-COL_M",
          descripcion: "CAMISETA COLUMBIA TEMPORADA LOGO AZUL HOMBRE",
          definicion: false,
          definidoEn_uuid: "parent-columbia",
        },
      ],
      {
        stockByCodigo: new Map([["TEE-COL_M", 1]]),
        complete: true,
        requestedCount: 1,
        resolvedCount: 1,
        missingCodes: [],
        errors: [],
      }
    )

    expect(snapshot.groups[0].brandSuggestion).toEqual({
      slug: "columbia",
      name: "Columbia",
    })
  })

  it("expone una sugerencia normalizada de categoría desde el producto padre", () => {
    const snapshot = normalizeLoggroCatalog(
      [
        {
          uuid: "parent-sandals",
          codigo: "SANDALS-BLK",
          descripcion: "SANDALIA SKECHERS MUJER NEGRA",
          definicion: true,
        },
        {
          uuid: "variant-sandals",
          codigo: "SANDALS-BLK_8",
          descripcion: "SANDALIA SKECHERS MUJER NEGRA",
          definicion: false,
          definidoEn_uuid: "parent-sandals",
        },
      ],
      {
        stockByCodigo: new Map([["SANDALS-BLK_8", 1]]),
        complete: true,
        requestedCount: 1,
        resolvedCount: 1,
        missingCodes: [],
        errors: [],
      }
    )

    expect(snapshot.groups[0].categorySuggestion).toEqual({
      slug: "chanclas-y-sandalias",
      name: "Chanclas y Sandalias",
    })
  })

  it("expone el género normalizado desde los textos del producto y sus variantes", () => {
    const snapshot = normalizeLoggroCatalog(
      [
        {
          uuid: "parent-women",
          codigo: "WOMEN-GRN",
          descripcion: "TENIS SKECHERS OUTDOOR VERDE",
          definicion: true,
        },
        {
          uuid: "variant-women",
          codigo: "WOMEN-GRN_8",
          descripcion: "TENIS SKECHERS OUTDOOR VERDE",
          descripcionDetallada: "TENIS SKECHERS MUJER OUTDOOR VERDE TALLA 8",
          definicion: false,
          definidoEn_uuid: "parent-women",
        },
      ],
      {
        stockByCodigo: new Map([["WOMEN-GRN_8", 1]]),
        complete: true,
        requestedCount: 1,
        resolvedCount: 1,
        missingCodes: [],
        errors: [],
      }
    )

    expect(snapshot.groups[0].gender).toBe("MUJER")
  })

  it("prioriza el género del producto padre sobre una talla mal etiquetada", () => {
    const snapshot = normalizeLoggroCatalog(
      [
        {
          uuid: "parent-men",
          codigo: "MEN-BKW",
          descripcion: "TENIS SKECHERS HOMBRE NEGRO",
          definicion: true,
        },
        {
          uuid: "variant-men",
          codigo: "MEN-BKW_5",
          descripcion: "TENIS SKECHERS HOMBRE NEGRO",
          descripcionDetallada: "TENIS SKECHERS HOMBRE NEGRO TALLA 5 MUJER",
          definicion: false,
          definidoEn_uuid: "parent-men",
        },
      ],
      {
        stockByCodigo: new Map([["MEN-BKW_5", 1]]),
        complete: true,
        requestedCount: 1,
        resolvedCount: 1,
        missingCodes: [],
        errors: [],
      }
    )

    expect(snapshot.groups[0].gender).toBe("HOMBRE")
  })

  it("deja vacío el género cuando las variantes no tienen consenso", () => {
    const snapshot = normalizeLoggroCatalog(
      [
        {
          uuid: "parent-ambiguous",
          codigo: "AMB-BLK",
          descripcion: "TENIS MODELO NEGRO",
          definicion: true,
        },
        {
          uuid: "variant-men",
          codigo: "AMB-BLK_8",
          descripcion: "TENIS MODELO HOMBRE NEGRO",
          definicion: false,
          definidoEn_uuid: "parent-ambiguous",
        },
        {
          uuid: "variant-unisex",
          codigo: "AMB-BLK_9",
          descripcion: "TENIS MODELO UNISEX NEGRO",
          definicion: false,
          definidoEn_uuid: "parent-ambiguous",
        },
      ],
      {
        stockByCodigo: new Map([
          ["AMB-BLK_8", 1],
          ["AMB-BLK_9", 1],
        ]),
        complete: true,
        requestedCount: 2,
        resolvedCount: 2,
        missingCodes: [],
        errors: [],
      }
    )

    expect(snapshot.groups[0].gender).toBeUndefined()
  })

  it("no resuelve desde variantes cuando el nombre padre es contradictorio", () => {
    const snapshot = normalizeLoggroCatalog(
      [
        {
          uuid: "parent-conflict",
          codigo: "CONFLICT-BLK",
          descripcion: "TENIS HOMBRE MUJER NEGRO",
          definicion: true,
        },
        {
          uuid: "variant-conflict",
          codigo: "CONFLICT-BLK_8",
          descripcion: "TENIS HOMBRE NEGRO",
          definicion: false,
          definidoEn_uuid: "parent-conflict",
        },
      ],
      {
        stockByCodigo: new Map([["CONFLICT-BLK_8", 1]]),
        complete: true,
        requestedCount: 1,
        resolvedCount: 1,
        missingCodes: [],
        errors: [],
      }
    )

    expect(snapshot.groups[0].gender).toBeUndefined()
  })

  it("rechaza el grupo si alguna variante contiene señales contradictorias", () => {
    const snapshot = normalizeLoggroCatalog(
      [
        {
          uuid: "parent-variant-conflict",
          codigo: "VAR-CONFLICT",
          descripcion: "TENIS MODELO NEGRO",
          definicion: true,
        },
        {
          uuid: "variant-clean",
          codigo: "VAR-CONFLICT_8",
          descripcion: "TENIS MODELO HOMBRE NEGRO",
          definicion: false,
          definidoEn_uuid: "parent-variant-conflict",
        },
        {
          uuid: "variant-ambiguous",
          codigo: "VAR-CONFLICT_9",
          descripcion: "TENIS MODELO HOMBRE MUJER NEGRO",
          definicion: false,
          definidoEn_uuid: "parent-variant-conflict",
        },
      ],
      {
        stockByCodigo: new Map([
          ["VAR-CONFLICT_8", 1],
          ["VAR-CONFLICT_9", 1],
        ]),
        complete: true,
        requestedCount: 2,
        resolvedCount: 2,
        missingCodes: [],
        errors: [],
      }
    )

    expect(snapshot.groups[0].gender).toBeUndefined()
  })

  it("expone una clave agnóstica de familia derivada del código padre", () => {
    const snapshot = normalizeLoggroCatalog(
      [
        {
          uuid: "parent-skechers",
          codigo: "180361GRN",
          descripcion: "TENIS SKECHERS MUJER VERDE",
          definicion: true,
          codigoCategoria: "004",
        },
        {
          uuid: "variant-skechers",
          codigo: "180361GRN_8",
          descripcion: "TENIS SKECHERS MUJER VERDE",
          definicion: false,
          definidoEn_uuid: "parent-skechers",
        },
      ],
      {
        stockByCodigo: new Map([["180361GRN_8", 1]]),
        complete: true,
        requestedCount: 1,
        resolvedCount: 1,
        missingCodes: [],
        errors: [],
      }
    )

    expect(snapshot.groups[0].colorFamilyKey).toBe("loggro:004:180361")
  })

  it("usa la definición como padre sin convertirla en una variante", () => {
    const items: LoggroCatalogItem[] = [
      {
        uuid: "parent-1",
        codigo: "1155111-MVR",
        descripcion: "TENIS HOKA SKYFLOW HOMBRE AZUL NARANJA",
        definicion: true,
        codigoCategoria: "007",
        precioDefecto: 599_900,
      },
      {
        uuid: "variant-1",
        codigo: "1155111-MVR_10",
        descripcion: "TENIS HOKA SKYFLOW HOMBRE AZUL NARANJA",
        definicion: false,
        definidoEn_uuid: "parent-1",
        precioDefecto: 599_900,
      },
      {
        uuid: "variant-2",
        codigo: "1155111-MVR_11",
        descripcion: "TENIS HOKA SKYFLOW HOMBRE AZUL NARANJA",
        definicion: false,
        definidoEn_uuid: "parent-1",
        precioDefecto: 599_900,
      },
    ]

    const snapshot = normalizeLoggroCatalog(items, {
      stockByCodigo: new Map([
        ["1155111-MVR_10", 3],
        ["1155111-MVR_11", 2],
      ]),
      complete: true,
      requestedCount: 2,
      resolvedCount: 2,
      missingCodes: [],
      errors: [],
    })

    expect(snapshot.groups).toHaveLength(1)
    expect(snapshot.groups[0]).toMatchObject({
      erpId: "parent-1",
      sku: "1155111-MVR",
    })
    expect(snapshot.groups[0].variants.map((variant) => variant.sku)).toEqual([
      "1155111-MVR_10",
      "1155111-MVR_11",
    ])
    expect(snapshot.diagnostics).toMatchObject({
      sourceItemCount: 3,
      definitionCount: 1,
      variantCount: 2,
      groupCount: 1,
    })
  })

  it("marca como sospechoso un snapshot completo cuyo stock total es cero", () => {
    const items: LoggroCatalogItem[] = [
      {
        uuid: "parent-1",
        codigo: "MODEL-BLK",
        descripcion: "TENIS MODELO NEGRO",
        definicion: true,
      },
      {
        uuid: "variant-1",
        codigo: "MODEL-BLK_9",
        descripcion: "TENIS MODELO NEGRO",
        definicion: false,
        definidoEn_uuid: "parent-1",
      },
    ]

    const snapshot = normalizeLoggroCatalog(items, {
      stockByCodigo: new Map([["MODEL-BLK_9", 0]]),
      complete: true,
      requestedCount: 1,
      resolvedCount: 1,
      missingCodes: [],
      errors: [],
    })

    expect(snapshot.stock.status).toBe("all_zero")
  })

  it("agrupa por SKU como fallback cuando el ERP no informa el padre", () => {
    const items: LoggroCatalogItem[] = [
      {
        uuid: "variant-1",
        codigo: "LEGACY-BLK_9",
        descripcion: "TENIS LEGACY NEGRO",
        definicion: false,
      },
      {
        uuid: "variant-2",
        codigo: "LEGACY-BLK_10",
        descripcion: "TENIS LEGACY NEGRO",
        definicion: false,
      },
    ]

    const snapshot = normalizeLoggroCatalog(items, {
      stockByCodigo: new Map([
        ["LEGACY-BLK_9", 1],
        ["LEGACY-BLK_10", 2],
      ]),
      complete: true,
      requestedCount: 2,
      resolvedCount: 2,
      missingCodes: [],
      errors: [],
    })

    expect(snapshot.groups).toHaveLength(1)
    expect(snapshot.groups[0].sku).toBe("LEGACY-BLK")
  })
})
