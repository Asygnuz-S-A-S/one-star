import { describe, expect, it } from "vitest"
import { classifyDevice, classifyWebEvent, normalizePath } from "../web-events"

describe("normalizePath", () => {
  it("quita query, hash y barra final", () => {
    expect(normalizePath("/productos/?a=1#x")).toBe("/productos")
    expect(normalizePath("productos")).toBe("/productos")
    expect(normalizePath("/")).toBe("/")
  })

  it("recorta rutas absurdamente largas", () => {
    expect(normalizePath(`/${"a".repeat(900)}`)).toHaveLength(500)
  })
})

describe("classifyWebEvent", () => {
  it("una ficha de producto es PRODUCT_VIEW con su slug", () => {
    const event = classifyWebEvent("/productos/tenis-one-star")

    expect(event.type).toBe("PRODUCT_VIEW")
    expect(event.productSlug).toBe("tenis-one-star")
  })

  it("el catálogo sin filtros es CATEGORY_VIEW", () => {
    expect(classifyWebEvent("/hombre")).toMatchObject({
      type: "CATEGORY_VIEW",
      categorySlug: "hombre",
    })
  })

  it("aplicar filtros es FILTER_APPLY y los guarda", () => {
    const event = classifyWebEvent("/hombre", "?talla=38&color=negro&precio_max=200000")

    expect(event.type).toBe("FILTER_APPLY")
    expect(event.categorySlug).toBe("hombre")
    expect(event.filters).toEqual({ talla: "38", color: "negro", precio_max: "200000" })
  })

  it("buscar manda sobre filtrar", () => {
    const event = classifyWebEvent("/buscar", "?q=tenis+blancos&color=blanco")

    expect(event.type).toBe("SEARCH")
    expect(event.searchTerm).toBe("tenis blancos")
    expect(event.filters).toEqual({ color: "blanco" })
  })

  it("el filtro `categoria` manda sobre el primer segmento de la ruta", () => {
    const event = classifyWebEvent("/productos", "?categoria=chaquetas")

    expect(event.categorySlug).toBe("chaquetas")
  })

  it("una página de marca guarda la marca", () => {
    const event = classifyWebEvent("/marcas/converse")

    expect(event.type).toBe("CATEGORY_VIEW")
    expect(event.brandSlug).toBe("converse")
  })

  it("el checkout y la confirmación tienen su propio tipo", () => {
    expect(classifyWebEvent("/checkout").type).toBe("CHECKOUT_START")
    expect(classifyWebEvent("/checkout/success").type).toBe("PURCHASE")
    expect(classifyWebEvent("/checkout/success", "?order=123").type).toBe("PURCHASE")
  })

  it("cualquier otra página es PAGE_VIEW y no inventa categoría", () => {
    const event = classifyWebEvent("/envios-y-devoluciones")

    expect(event.type).toBe("PAGE_VIEW")
    expect(event.categorySlug).toBeNull()
  })

  it("ignora parámetros que no son filtros conocidos", () => {
    const event = classifyWebEvent("/hombre", "?fbclid=abc&utm_source=meta")

    expect(event.type).toBe("CATEGORY_VIEW")
    expect(event.filters).toBeNull()
  })

  it("recorta valores de filtro demasiado largos", () => {
    const event = classifyWebEvent("/hombre", `?color=${"x".repeat(500)}`)

    expect(event.filters?.color).toHaveLength(120)
  })
})

describe("classifyDevice", () => {
  it("distingue móvil, tablet y escritorio sin guardar el user-agent", () => {
    expect(classifyDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("mobile")
    expect(classifyDevice("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet")
    expect(classifyDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("desktop")
    expect(classifyDevice(null)).toBeNull()
  })
})
