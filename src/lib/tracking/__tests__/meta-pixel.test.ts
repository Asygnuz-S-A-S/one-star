import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  buildMetaCommerceParams,
  clearPendingMetaEvents,
  flushPendingMetaEvents,
  getPendingMetaEventCount,
  isMetaPixelLoaded,
  trackMetaEvent,
} from "../meta-pixel"

/**
 * El píxel se inyecta con `strategy="afterInteractive"`, así que `window.fbq`
 * no existe en los primeros instantes. Estas pruebas cubren justo esa ventana:
 * antes, los eventos disparados al montar (ViewContent, InitiateCheckout) se
 * descartaban en silencio y nunca llegaban a Meta.
 */

type FbqCall = unknown[]

const COOKIE_ACCEPTED = "onestar_cookie_consent=accepted"
const COOKIE_REJECTED = "onestar_cookie_consent=rejected"

let fbqCalls: FbqCall[] = []

/** Simula un navegador sin píxel cargado todavía. */
function givenBrowser(cookie: string): void {
  fbqCalls = []
  ;(globalThis as Record<string, unknown>).document = { cookie }
  ;(globalThis as Record<string, unknown>).window = {
    // Envolvemos en lugar de referenciar para que los fake timers de vitest,
    // que reemplazan los globales, también apliquen aquí.
    setInterval: (handler: () => void, ms: number) => globalThis.setInterval(handler, ms),
    clearInterval: (id: number) => globalThis.clearInterval(id),
  }
}

/** Simula que el snippet del píxel ya corrió y `fbq` quedó disponible. */
function givenPixelLoaded(): void {
  const win = (globalThis as Record<string, unknown>).window as Record<string, unknown>
  win.fbq = (...args: FbqCall) => {
    fbqCalls.push(args)
  }
}

beforeEach(() => {
  givenBrowser(COOKIE_ACCEPTED)
})

afterEach(() => {
  clearPendingMetaEvents()
  vi.useRealTimers()
  delete (globalThis as Record<string, unknown>).window
  delete (globalThis as Record<string, unknown>).document
})

describe("isMetaPixelLoaded", () => {
  it("es falso mientras fbq no existe y verdadero cuando el snippet corrió", () => {
    expect(isMetaPixelLoaded()).toBe(false)
    givenPixelLoaded()
    expect(isMetaPixelLoaded()).toBe(true)
  })
})

describe("trackMetaEvent con el píxel ya cargado", () => {
  it("entrega el evento directo a fbq", () => {
    givenPixelLoaded()

    expect(trackMetaEvent("AddToCart", { value: 1000, currency: "COP" })).toBe(true)

    expect(fbqCalls).toEqual([["track", "AddToCart", { value: 1000, currency: "COP" }]])
    expect(getPendingMetaEventCount()).toBe(0)
  })

  it("pasa el eventID para que Meta deduplique con el evento server-side", () => {
    givenPixelLoaded()

    trackMetaEvent("Purchase", { value: 50_000 }, { eventId: "pedido-123" })

    expect(fbqCalls[0]).toEqual([
      "track",
      "Purchase",
      { value: 50_000 },
      { eventID: "pedido-123" },
    ])
  })
})

describe("trackMetaEvent antes de que el píxel cargue", () => {
  it("encola el evento en vez de perderlo", () => {
    expect(trackMetaEvent("InitiateCheckout", { value: 120_000 })).toBe(true)

    expect(getPendingMetaEventCount()).toBe(1)
    expect(fbqCalls).toHaveLength(0)
  })

  it("entrega lo encolado, en orden, cuando el píxel carga", () => {
    trackMetaEvent("ViewContent", { content_ids: ["p-1"] })
    trackMetaEvent("InitiateCheckout", { value: 120_000 })

    givenPixelLoaded()
    const flushed = flushPendingMetaEvents()

    expect(flushed).toBe(2)
    expect(fbqCalls).toEqual([
      ["track", "ViewContent", { content_ids: ["p-1"] }],
      ["track", "InitiateCheckout", { value: 120_000 }],
    ])
    expect(getPendingMetaEventCount()).toBe(0)
  })

  it("vacía la cola sola en cuanto fbq aparece, sin esperar a nadie", () => {
    vi.useFakeTimers()

    trackMetaEvent("InitiateCheckout", { value: 99_000 })
    expect(getPendingMetaEventCount()).toBe(1)

    givenPixelLoaded()
    vi.advanceTimersByTime(200)

    expect(fbqCalls).toEqual([["track", "InitiateCheckout", { value: 99_000 }]])
    expect(getPendingMetaEventCount()).toBe(0)
  })

  it("descarta la cola si el píxel nunca aparece, sin crecer sin límite", () => {
    vi.useFakeTimers()

    trackMetaEvent("ViewContent", { content_ids: ["p-1"] })
    vi.advanceTimersByTime(20_000)

    expect(getPendingMetaEventCount()).toBe(0)
    expect(fbqCalls).toHaveLength(0)
  })

  it("no guarda más de 20 eventos pendientes", () => {
    for (let i = 0; i < 25; i += 1) {
      trackMetaEvent("ViewContent", { content_ids: [`p-${i}`] })
    }

    expect(getPendingMetaEventCount()).toBe(20)
  })

  it("entrega primero la cola y después el evento nuevo", () => {
    trackMetaEvent("ViewContent", { content_ids: ["p-1"] })
    givenPixelLoaded()

    trackMetaEvent("AddToCart", { content_ids: ["p-1"] })

    expect(fbqCalls).toEqual([
      ["track", "ViewContent", { content_ids: ["p-1"] }],
      ["track", "AddToCart", { content_ids: ["p-1"] }],
    ])
  })
})

describe("consentimiento de cookies", () => {
  it("no encola nada si el visitante no aceptó", () => {
    givenBrowser(COOKIE_REJECTED)

    expect(trackMetaEvent("InitiateCheckout", { value: 120_000 })).toBe(false)
    expect(getPendingMetaEventCount()).toBe(0)
  })

  it("no encola nada si todavía no respondió el banner", () => {
    givenBrowser("")

    expect(trackMetaEvent("ViewContent", {})).toBe(false)
    expect(getPendingMetaEventCount()).toBe(0)
  })

  it("clearPendingMetaEvents bota lo pendiente sin enviarlo", () => {
    trackMetaEvent("ViewContent", {})
    expect(getPendingMetaEventCount()).toBe(1)

    clearPendingMetaEvents()
    givenPixelLoaded()

    expect(flushPendingMetaEvents()).toBe(0)
    expect(fbqCalls).toHaveLength(0)
  })
})

describe("buildMetaCommerceParams", () => {
  it("arma contents, valor y número de artículos del carrito", () => {
    const params = buildMetaCommerceParams([
      { productId: "p-1", quantity: 2, price: 50_000 },
      { productId: "p-2", quantity: 1, price: 30_000 },
    ])

    expect(params).toEqual({
      content_type: "product",
      content_ids: ["p-1", "p-2"],
      contents: [
        { id: "p-1", quantity: 2, item_price: 50_000 },
        { id: "p-2", quantity: 1, item_price: 30_000 },
      ],
      value: 130_000,
      currency: "COP",
      num_items: 3,
    })
  })
})
