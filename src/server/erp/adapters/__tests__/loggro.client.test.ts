import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { LoggroClient } from "../loggro.client"

describe("LoggroClient.getDisponibilidadSnapshot", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("marca el stock como parcial cuando no hay bodegas consultables", async () => {
    const client = new LoggroClient("token")
    vi.spyOn(
      client as unknown as { resolveStockLocations: () => Promise<unknown[]> },
      "resolveStockLocations"
    ).mockResolvedValue([])

    const snapshot = await client.getDisponibilidadSnapshot(["SKU-1"])

    expect(snapshot).toMatchObject({
      complete: false,
      requestedCount: 1,
      resolvedCount: 0,
      missingCodes: ["SKU-1"],
    })
  })

  it("prefiere la bodega de punto de venta aunque Loggro liste primero separados", async () => {
    const client = new LoggroClient("token")
    vi.spyOn(client, "getEstablecimientos").mockResolvedValue([
      { uuid: "est-1", nombre: "Centro", tipoNodo: "EST" },
    ])
    vi.spyOn(client, "getBodegas").mockResolvedValue([
      { uuid: "bod-separados", nombre: "0002S - Bodega Separados Centro", padre: "est-1" },
      { uuid: "bod-pos", nombre: "0002 - Bodega Punto de Venta Centro", padre: "est-1" },
    ])
    const internal = client as unknown as {
      resolveStockLocations: (timeoutMs?: number, useCache?: boolean) => Promise<
        Array<{ bodegaUuid: string }>
      >
    }

    const locations = await internal.resolveStockLocations(1_000, false)

    expect(locations).toEqual([expect.objectContaining({ bodegaUuid: "bod-pos" })])
  })

  it("omite la sede cuando solo tiene bodegas de separados", async () => {
    const client = new LoggroClient("token")
    vi.spyOn(client, "getEstablecimientos").mockResolvedValue([
      { uuid: "est-1", nombre: "Centro", tipoNodo: "EST" },
    ])
    vi.spyOn(client, "getBodegas").mockResolvedValue([
      { uuid: "bod-separados", nombre: "0002S - Bodega Separados Centro", padre: "est-1" },
    ])
    const internal = client as unknown as {
      resolveStockLocations: (timeoutMs?: number, useCache?: boolean) => Promise<unknown[]>
    }

    const locations = await internal.resolveStockLocations(1_000, false)

    expect(locations).toEqual([])
  })

  it("acota los descartes de SKU inválidos por lote", async () => {
    const client = new LoggroClient("token")
    vi.spyOn(
      client as unknown as { resolveStockLocations: () => Promise<unknown[]> },
      "resolveStockLocations"
    ).mockResolvedValue([
      { establecimientoUuid: "est-1", establecimientoNombre: "Uno", bodegaUuid: "bod-1" },
    ])
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        items: Array<{ codigoItem: string }>
      }
      const missing = body.items[0].codigoItem
      return new Response(
        JSON.stringify({ errores: [{ mensaje: `Producto no encontrado: ${missing}` }] }),
        { status: 400 }
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    const codes = Array.from({ length: 100 }, (_, index) => `INVALID-${index}`)
    const snapshot = await client.getDisponibilidadSnapshot(codes)

    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(11)
    expect(snapshot.complete).toBe(false)
    expect(snapshot.resolvedCount).toBe(0)
  })

  it("detiene tareas pendientes cuando se agota el presupuesto total del snapshot", async () => {
    const client = new LoggroClient("token")
    vi.spyOn(
      client as unknown as { resolveStockLocations: () => Promise<unknown[]> },
      "resolveStockLocations"
    ).mockResolvedValue([
      { establecimientoUuid: "est-1", establecimientoNombre: "Uno", bodegaUuid: "bod-1" },
    ])

    const initialTime = Date.now()
    let currentTime = initialTime
    vi.spyOn(Date, "now").mockImplementation(() => currentTime)
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      currentTime = initialTime + 61_000
      const body = JSON.parse(String(init?.body)) as {
        items: Array<{ codigoItem: string }>
      }
      return new Response(
        JSON.stringify({
          contenido: body.items.map(({ codigoItem }) => ({
            codigo: codigoItem,
            cantidadDisponible: 1,
          })),
        }),
        { status: 200 }
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    const codes = Array.from({ length: 500 }, (_, index) => `SKU-${index}`)
    const snapshot = await client.getDisponibilidadSnapshot(codes)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(snapshot.complete).toBe(false)
    expect(snapshot.resolvedCount).toBe(100)
  })

  it("consulta sedes en paralelo al construir el snapshot completo", async () => {
    const client = new LoggroClient("token")
    vi.spyOn(
      client as unknown as { resolveStockLocations: () => Promise<unknown[]> },
      "resolveStockLocations"
    ).mockResolvedValue([
      { establecimientoUuid: "est-1", establecimientoNombre: "Uno", bodegaUuid: "bod-1" },
      { establecimientoUuid: "est-2", establecimientoNombre: "Dos", bodegaUuid: "bod-2" },
    ])

    let started = 0
    let releaseBoth: (() => void) | undefined
    const bothStarted = new Promise<void>((resolve) => {
      releaseBoth = resolve
    })
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      started += 1
      if (started === 2) releaseBoth?.()
      await Promise.race([
        bothStarted,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Las sedes se consultaron secuencialmente.")), 100)
        ),
      ])
      const body = JSON.parse(String(init?.body)) as {
        items: Array<{ codigoItem: string }>
      }
      return new Response(
        JSON.stringify({
          contenido: body.items.map(({ codigoItem }) => ({
            codigo: codigoItem,
            cantidadDisponible: 1,
          })),
        }),
        { status: 200 }
      )
    }))

    const snapshot = await client.getDisponibilidadSnapshot(["SKU-1"])

    expect(started).toBe(2)
    expect(snapshot.complete).toBe(true)
    expect(snapshot.stockByCodigo.get("SKU-1")).toBe(2)
  })

  it("limita la duración de las peticiones HTTP con una señal de aborto", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ contenido: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    vi.stubGlobal("fetch", fetchMock)
    const client = new LoggroClient("token")

    await client.ping()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it("diagnostica conexión, catálogo y stock con HTTP y latencia sin llamar endpoints de escritura", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [{ uuid: "est-1", tipoNodo: "EST" }] }), {
          status: 200,
        })
      }
      if (url.includes("/bodegas")) {
        return new Response(JSON.stringify({ contenido: [{ uuid: "bod-1", padre: "est-1" }] }), {
          status: 200,
        })
      }
      if (url.includes("/items?")) {
        return new Response(
          JSON.stringify({
            contenido: {
              content: [{ uuid: "v-1", codigo: "SKU-1", definicion: false }],
              totalElements: 1,
              last: true,
            },
          }),
          { status: 200 }
        )
      }
      if (url.includes("/disponibilidad-productos")) {
        expect(init?.method).toBe("POST")
        return new Response(
          JSON.stringify({ contenido: [{ codigo: "SKU-1", cantidadDisponible: 0 }] }),
          { status: 200 }
        )
      }
      throw new Error(`URL inesperada: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)
    const client = new LoggroClient("token")

    const result = await client.diagnoseEndpoints()

    expect(result).toHaveLength(3)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint: "connection", status: "healthy", httpStatus: 200 }),
        expect.objectContaining({ endpoint: "catalog", status: "healthy", httpStatus: 200 }),
        expect.objectContaining({ endpoint: "stock", status: "warning", httpStatus: 200 }),
      ])
    )
    expect(result.every((probe) => probe.latencyMs >= 0)).toBe(true)
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/salidas"))).toBe(false)
  })

  it("conserva el HTTP sin exponer el cuerpo crudo cuando falla el catálogo", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      return new Response('{"internal":"detalle privado"}', { status: 503 })
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await new LoggroClient("token").diagnoseEndpoints()
    const catalog = result.find((probe) => probe.endpoint === "catalog")

    expect(catalog).toMatchObject({ status: "error", httpStatus: 503 })
    expect(catalog?.detail).not.toContain("detalle privado")
    expect(result.find((probe) => probe.endpoint === "stock")).toMatchObject({
      status: "error",
      httpStatus: null,
    })
  })

  it("mantiene el manejo histórico de errores en peticiones tipadas compartidas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"internal":"detalle privado"}', { status: 500 })
      )
    )

    await expect(new LoggroClient("token").getProducts()).rejects.toThrow("detalle privado")
  })

  it("valida que errores estructurados sean arrays y conserva su detalle saneado", async () => {
    const client = new LoggroClient("token")
    const readSafeDetail = client as unknown as { safeErrorDetail: (text: string) => string }

    expect(readSafeDetail.safeErrorDetail('{"errores":{"mensaje":"no debe iterar"}}')).toBe(
      "El proveedor no entregó un detalle seguro."
    )
    expect(
      readSafeDetail.safeErrorDetail(
        '{"errores":[{"mensaje":"Producto no encontrado: SKU-1"}]}'
      )
    ).toBe("Producto no encontrado: SKU-1")
    expect(readSafeDetail.safeErrorDetail('{"errores":[null,"texto",{}]}')).toBe(
      "El proveedor no entregó un detalle seguro."
    )
    expect(
      readSafeDetail.safeErrorDetail(
        '{"errores":[{"mensaje":"Cliente Juan, documento 12345678"}]}'
      )
    ).toBe("El proveedor no entregó un detalle seguro.")
  })

  it("pagina de forma acotada hasta encontrar cinco SKU vendibles y usa resolveStockLocations", async () => {
    const client = new LoggroClient("token")
    const resolveStockLocations = vi.spyOn(
      client as unknown as {
        resolveStockLocations: (timeoutMs?: number) => Promise<Array<{
          establecimientoUuid: string
          establecimientoNombre: string
          bodegaUuid: string
        }>>
      },
      "resolveStockLocations"
    ).mockResolvedValue([
      { establecimientoUuid: "env-est", establecimientoNombre: "Sede", bodegaUuid: "env-bod" },
    ])
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      if (url.includes("/items?")) {
        const page = Number(new URL(url).searchParams.get("pagina"))
        const content = page < 3
          ? [{ codigo: `DEF-${page}`, definicion: true }]
          : Array.from({ length: 5 }, (_, index) => ({
              codigo: `SKU-${index + 1}`,
              definicion: false,
            }))
        return new Response(
          JSON.stringify({ contenido: { content, totalElements: 305, last: false } }),
          { status: 200 }
        )
      }
      if (url.includes("/disponibilidad-productos")) {
        const body = JSON.parse(String(init?.body)) as { items: Array<{ codigoItem: string }> }
        expect(body.items).toHaveLength(5)
        expect(body.items[0].codigoItem).toBe("SKU-1")
        expect(body).toMatchObject({
          establecimientoUuid: "env-est",
          bodegaUuid: "env-bod",
        })
        return new Response(
          JSON.stringify({
            contenido: body.items.map(({ codigoItem }) => ({
              codigo: codigoItem,
              cantidadDisponible: 1,
            })),
          }),
          { status: 200 }
        )
      }
      throw new Error(`URL inesperada: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await client.diagnoseEndpoints()

    expect(resolveStockLocations).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("pagina=3"))).toBe(true)
    expect(result.find((probe) => probe.endpoint === "stock")?.status).toBe("healthy")
  })

  it("detiene el muestreo tras cinco páginas si el catálogo solo contiene definiciones", async () => {
    const client = new LoggroClient("token")
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          contenido: {
            content: [{ codigo: "DEF", definicion: true }],
            totalElements: 1_000,
            last: false,
          },
        }),
        { status: 200 }
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await client.diagnoseEndpoints()

    const catalogCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/items?"))
    expect(catalogCalls).toHaveLength(5)
    expect(result.find((probe) => probe.endpoint === "catalog")?.status).toBe("warning")
    expect(result.find((probe) => probe.endpoint === "stock")?.status).toBe("error")
  })

  it("conserva la muestra y reporta timeout sin arrastrar HTTP 200 de una página anterior", async () => {
    const client = new LoggroClient("token")
    vi.spyOn(
      client as unknown as { resolveStockLocations: (timeoutMs?: number) => Promise<unknown[]> },
      "resolveStockLocations"
    ).mockResolvedValue([
      { establecimientoUuid: "est-1", establecimientoNombre: "Uno", bodegaUuid: "bod-1" },
    ])
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      if (url.includes("pagina=0")) {
        return new Response(
          JSON.stringify({ contenido: {
            content: [{ codigo: "SKU-1", definicion: false }],
            totalElements: 500,
            last: false,
          } }),
          { status: 200 }
        )
      }
      if (url.includes("pagina=1")) throw new DOMException("timeout", "TimeoutError")
      if (url.includes("/disponibilidad-productos")) {
        const body = JSON.parse(String(init?.body)) as { items: Array<{ codigoItem: string }> }
        return new Response(
          JSON.stringify({ contenido: [{ codigo: body.items[0].codigoItem, cantidadDisponible: 1 }] }),
          { status: 200 }
        )
      }
      throw new Error(`URL inesperada: ${url}`)
    }))

    const result = await client.diagnoseEndpoints()
    const catalog = result.find((probe) => probe.endpoint === "catalog")

    expect(catalog).toMatchObject({ status: "warning", httpStatus: null })
    expect(catalog?.detail.toLowerCase()).toContain("tiempo")
    expect(catalog?.detail).toContain("página 2")
    expect(result.find((probe) => probe.endpoint === "stock")?.status).toBe("healthy")
  })

  it("distingue un fallo HTTP posterior y conserva el diagnóstico parcial", async () => {
    const client = new LoggroClient("token")
    vi.spyOn(
      client as unknown as { resolveStockLocations: (timeoutMs?: number) => Promise<unknown[]> },
      "resolveStockLocations"
    ).mockResolvedValue([
      { establecimientoUuid: "est-1", establecimientoNombre: "Uno", bodegaUuid: "bod-1" },
    ])
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      if (url.includes("pagina=0")) {
        return new Response(
          JSON.stringify({ contenido: {
            content: [{ codigo: "SKU-1", definicion: false }],
            totalElements: 500,
            last: false,
          } }),
          { status: 200 }
        )
      }
      if (url.includes("pagina=1")) return new Response("error", { status: 503 })
      if (url.includes("/disponibilidad-productos")) {
        const body = JSON.parse(String(init?.body)) as { items: Array<{ codigoItem: string }> }
        return new Response(
          JSON.stringify({ contenido: [{ codigo: body.items[0].codigoItem, cantidadDisponible: 1 }] }),
          { status: 200 }
        )
      }
      throw new Error(`URL inesperada: ${url}`)
    }))

    const result = await client.diagnoseEndpoints()
    const catalog = result.find((probe) => probe.endpoint === "catalog")

    expect(catalog).toMatchObject({ status: "warning", httpStatus: 503 })
    expect(catalog?.detail).toContain("página 2")
    expect(catalog?.detail).toContain("HTTP 503")
    expect(result.find((probe) => probe.endpoint === "stock")?.status).toBe("healthy")
  })

  it("distingue cuando el catálogo no se ejecuta por presupuesto agotado", async () => {
    vi.useFakeTimers()
    const client = new LoggroClient("token")
    const initialTime = Date.now()
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/establecimientos")) {
        vi.setSystemTime(initialTime + 16_000)
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      throw new Error(`No debía ejecutarse: ${url}`)
    }))

    const result = await client.diagnoseEndpoints()
    const catalog = result.find((probe) => probe.endpoint === "catalog")

    expect(catalog).toMatchObject({ status: "error", httpStatus: null })
    expect(catalog?.detail).toContain("No se ejecutó")
  })

  it("clasifica items malformados del catálogo sin perder SKU válidos", async () => {
    const client = new LoggroClient("token")
    vi.spyOn(
      client as unknown as { resolveStockLocations: (timeoutMs?: number) => Promise<unknown[]> },
      "resolveStockLocations"
    ).mockResolvedValue([
      { establecimientoUuid: "est-1", establecimientoNombre: "Uno", bodegaUuid: "bod-1" },
    ])
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      if (url.includes("/items?")) {
        return new Response(
          JSON.stringify({ contenido: {
            content: [null, "texto", 42, { codigo: "SKU-1", definicion: false }],
            totalElements: 4,
            last: true,
          } }),
          { status: 200 }
        )
      }
      const body = JSON.parse(String(init?.body)) as { items: Array<{ codigoItem: string }> }
      return new Response(
        JSON.stringify({ contenido: [{ codigo: body.items[0].codigoItem, cantidadDisponible: 1 }] }),
        { status: 200 }
      )
    }))

    const result = await client.diagnoseEndpoints()

    expect(result.find((probe) => probe.endpoint === "catalog")).toMatchObject({
      status: "warning",
      detail: expect.stringContaining("3 inconsistencia"),
    })
    expect(result.find((probe) => probe.endpoint === "stock")?.status).toBe("healthy")
  })

  it("rechaza metadata, definición y códigos con forma inválida sin stringificar objetos", async () => {
    const client = new LoggroClient("token")
    vi.spyOn(
      client as unknown as { resolveStockLocations: (timeoutMs?: number, useCache?: boolean) => Promise<unknown[]> },
      "resolveStockLocations"
    ).mockResolvedValue([
      { establecimientoUuid: "est-1", establecimientoNombre: "Uno", bodegaUuid: "bod-1" },
    ])
    const stockBodies: unknown[] = []
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      if (url.includes("/items?")) {
        return new Response(
          JSON.stringify({ contenido: {
            content: [
              { codigo: { private: "object-code" }, definicion: false },
              { codigo: true, definicion: false },
              { codigo: "SKU-1", definicion: "false" },
              { codigo: "SKU-2", definicion: false },
            ],
            totalElements: -1,
            last: true,
          } }),
          { status: 200 }
        )
      }
      stockBodies.push(JSON.parse(String(init?.body)))
      return new Response(
        JSON.stringify({ contenido: [
          { codigo: "SKU-1", cantidadDisponible: 1 },
          { codigo: "SKU-2", cantidadDisponible: 1 },
        ] }),
        { status: 200 }
      )
    }))

    const result = await client.diagnoseEndpoints()
    const serializedBodies = JSON.stringify(stockBodies)

    expect(result.find((probe) => probe.endpoint === "catalog")?.status).toBe("warning")
    expect(serializedBodies).not.toContain("[object Object]")
    expect(serializedBodies).not.toContain("object-code")
    expect(serializedBodies).not.toContain('"codigoItem":true')
  })

  it("clasifica elementos null o primitivos del stock sin lanzar ni perder filas válidas", async () => {
    const client = new LoggroClient("token")
    vi.spyOn(
      client as unknown as { resolveStockLocations: (timeoutMs?: number) => Promise<unknown[]> },
      "resolveStockLocations"
    ).mockResolvedValue([
      { establecimientoUuid: "est-1", establecimientoNombre: "Uno", bodegaUuid: "bod-1" },
    ])
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      if (url.includes("/items?")) {
        return new Response(
          JSON.stringify({ contenido: {
            content: [{ codigo: "SKU-1", definicion: false }],
            totalElements: 1,
            last: true,
          } }),
          { status: 200 }
        )
      }
      return new Response(
        JSON.stringify({ contenido: [
          null,
          "texto",
          42,
          { codigo: "SKU-1", cantidadDisponible: 2 },
        ] }),
        { status: 200 }
      )
    }))

    const result = await client.diagnoseEndpoints()

    expect(result.find((probe) => probe.endpoint === "stock")).toMatchObject({
      status: "warning",
      detail: expect.stringContaining("3 inconsistencia"),
    })
  })

  it("prioriza una falla de red sobre HTTP 200 de otra sede y detalla el resultado parcial", async () => {
    const client = new LoggroClient("token")
    const locations = Array.from({ length: 11 }, (_, index) => ({
      establecimientoUuid: `est-${index}`,
      establecimientoNombre: `Sede ${index}`,
      bodegaUuid: `bod-${index}`,
    }))
    vi.spyOn(
      client as unknown as { resolveStockLocations: (timeoutMs?: number, useCache?: boolean) => Promise<unknown[]> },
      "resolveStockLocations"
    ).mockResolvedValue(locations)
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      if (url.includes("/items?")) {
        return new Response(
          JSON.stringify({ contenido: {
            content: [{ codigo: "SKU-1", definicion: false }],
            totalElements: 1,
            last: true,
          } }),
          { status: 200 }
        )
      }
      const body = JSON.parse(String(init?.body)) as { establecimientoUuid: string }
      if (body.establecimientoUuid === "est-0") throw new TypeError("network down")
      if (body.establecimientoUuid === "est-1") {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      return new Response(
        JSON.stringify({ contenido: [{ codigo: "SKU-1", cantidadDisponible: 1 }] }),
        { status: 200 }
      )
    }))

    const result = await client.diagnoseEndpoints()
    const stock = result.find((probe) => probe.endpoint === "stock")

    expect(stock).toMatchObject({ status: "warning", httpStatus: null })
    expect(stock?.detail).toContain("1 sede")
    expect(stock?.detail).toContain("1 inconsistencia")
    expect(stock?.detail).toContain("1 truncada")
  })

  it("resuelve ubicaciones sin usar ni envenenar la caché compartida", async () => {
    const client = new LoggroClient("token")
    const internal = client as unknown as {
      stockLocationsPromise: Promise<unknown[]>
      resolveStockLocations: (timeoutMs?: number, useCache?: boolean) => Promise<unknown[]>
    }
    internal.stockLocationsPromise = new Promise(() => undefined)
    const resolver = vi.spyOn(internal, "resolveStockLocations").mockResolvedValue([
      { establecimientoUuid: "fresh-est", establecimientoNombre: "Fresh", bodegaUuid: "fresh-bod" },
    ])
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      if (url.includes("/items?")) {
        return new Response(
          JSON.stringify({ contenido: {
            content: [{ codigo: "SKU-1", definicion: false }],
            totalElements: 1,
            last: true,
          } }),
          { status: 200 }
        )
      }
      const body = JSON.parse(String(init?.body)) as { establecimientoUuid: string }
      expect(body.establecimientoUuid).toBe("fresh-est")
      return new Response(
        JSON.stringify({ contenido: [{ codigo: "SKU-1", cantidadDisponible: 1 }] }),
        { status: 200 }
      )
    }))

    const result = await client.diagnoseEndpoints()

    expect(resolver).toHaveBeenCalledWith(expect.any(Number), false)
    expect(result.find((probe) => probe.endpoint === "stock")?.status).toBe("healthy")
  })

  it("useCache=false ignora la promesa existente y se propaga al resolver principal", async () => {
    const client = new LoggroClient("token")
    const stalePromise = Promise.resolve([
      { establecimientoUuid: "stale", establecimientoNombre: "Stale", bodegaUuid: "stale" },
    ])
    const internal = client as unknown as {
      stockLocationsPromise: Promise<unknown[]>
      resolveStockLocations: (timeoutMs?: number, useCache?: boolean) => Promise<unknown[]>
      resolveLocation: (timeoutMs?: number, useCache?: boolean) => Promise<unknown>
    }
    internal.stockLocationsPromise = stalePromise
    vi.spyOn(client, "getEstablecimientos").mockResolvedValue([])
    vi.spyOn(client, "getBodegas").mockResolvedValue([])
    const resolveLocation = vi.spyOn(internal, "resolveLocation").mockResolvedValue({
      establecimientoUuid: "fresh",
      establecimientoNombre: "Fresh",
      bodegaUuid: "fresh",
    })

    const result = await internal.resolveStockLocations(100, false)

    expect(resolveLocation).toHaveBeenCalledWith(expect.any(Number), false)
    expect(result).toEqual([
      { establecimientoUuid: "fresh", establecimientoNombre: "Fresh", bodegaUuid: "fresh" },
    ])
    expect(internal.stockLocationsPromise).toBe(stalePromise)
  })

  it("consulta sedes en paralelo y acota cada request al presupuesto global", async () => {
    const client = new LoggroClient("token")
    vi.spyOn(
      client as unknown as { resolveStockLocations: (timeoutMs?: number) => Promise<unknown[]> },
      "resolveStockLocations"
    ).mockResolvedValue([
      { establecimientoUuid: "est-1", establecimientoNombre: "Uno", bodegaUuid: "bod-1" },
      { establecimientoUuid: "est-2", establecimientoNombre: "Dos", bodegaUuid: "bod-2" },
    ])
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout")
    let stockCalls = 0
    let releaseStock: (() => void) | undefined
    const bothStarted = new Promise<void>((resolve) => { releaseStock = resolve })
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      if (url.includes("/items?")) {
        return new Response(
          JSON.stringify({
            contenido: {
              content: [{ codigo: "SKU-1", definicion: false }],
              totalElements: 1,
              last: true,
            },
          }),
          { status: 200 }
        )
      }
      if (url.includes("/disponibilidad-productos")) {
        stockCalls += 1
        if (stockCalls === 2) releaseStock?.()
        await bothStarted
        const body = JSON.parse(String(init?.body)) as { items: Array<{ codigoItem: string }> }
        return new Response(
          JSON.stringify({ contenido: [{ codigo: body.items[0].codigoItem, cantidadDisponible: 1 }] }),
          { status: 200 }
        )
      }
      throw new Error(`URL inesperada: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    await client.diagnoseEndpoints()

    expect(stockCalls).toBe(2)
    expect(timeoutSpy.mock.calls.every(([timeout]) => timeout <= 15_000)).toBe(true)
  })

  it("respeta el presupuesto global aunque la resolución cacheada de sedes no termine", async () => {
    vi.useFakeTimers()
    const client = new LoggroClient("token")
    vi.spyOn(
      client as unknown as { resolveStockLocations: (timeoutMs?: number) => Promise<unknown[]> },
      "resolveStockLocations"
    ).mockReturnValue(new Promise(() => undefined))
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          contenido: {
            content: [{ codigo: "SKU-1", definicion: false }],
            totalElements: 1,
            last: true,
          },
        }),
        { status: 200 }
      )
    }))

    const diagnosticsPromise = client.diagnoseEndpoints()
    await vi.runAllTimersAsync()
    const result = await diagnosticsPromise

    expect(result.find((probe) => probe.endpoint === "stock")).toMatchObject({
      status: "error",
      httpStatus: null,
    })
  })

  it.each([
    ["duplicados", [
      { codigo: "SKU-1", cantidadDisponible: 2 },
      { codigo: "SKU-1", cantidadDisponible: 2 },
    ]],
    ["SKU inesperado", [{ codigo: "OTRO", cantidadDisponible: 2 }]],
    ["cantidad NaN", [{ codigo: "SKU-1", cantidadDisponible: "no-numero" }]],
    ["cantidad nula", [{ codigo: "SKU-1", cantidadDisponible: null }]],
    ["SKU faltante", []],
  ])("nunca marca stock healthy con %s", async (_case, rows) => {
    const client = new LoggroClient("token")
    vi.spyOn(
      client as unknown as { resolveStockLocations: (timeoutMs?: number) => Promise<unknown[]> },
      "resolveStockLocations"
    ).mockResolvedValue([
      { establecimientoUuid: "est-1", establecimientoNombre: "Uno", bodegaUuid: "bod-1" },
    ])
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/establecimientos")) {
        return new Response(JSON.stringify({ contenido: [] }), { status: 200 })
      }
      if (url.includes("/items?")) {
        return new Response(
          JSON.stringify({
            contenido: {
              content: [{ codigo: "SKU-1", definicion: false }],
              totalElements: 1,
              last: true,
            },
          }),
          { status: 200 }
        )
      }
      return new Response(JSON.stringify({ contenido: rows }), { status: 200 })
    }))

    const result = await client.diagnoseEndpoints()

    expect(result.find((probe) => probe.endpoint === "stock")?.status).not.toBe("healthy")
  })
})
