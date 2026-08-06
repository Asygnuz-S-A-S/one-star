import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { LoggroClient } from "../loggro.client"

describe("LoggroClient.getDisponibilidadSnapshot", () => {
  afterEach(() => vi.unstubAllGlobals())

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
})
