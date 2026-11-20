import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const upsertWebVisitor = vi.fn()
const createWebEvent = vi.fn()
const deleteWebEventsOlderThan = vi.fn()
const findRecentFilterEvents = vi.fn()
const findTopCategories = vi.fn()
const findAnalyticsSummary = vi.fn()
const findFunnel = vi.fn()
const findTopProducts = vi.fn()
const findProductsViewedNotPurchased = vi.fn()
const findTopSearches = vi.fn()
const findTrafficSources = vi.fn()

vi.mock("@/server/repositories/web-analytics.repository", () => ({
  upsertWebVisitor: (...args: unknown[]) => upsertWebVisitor(...args),
  createWebEvent: (...args: unknown[]) => createWebEvent(...args),
  deleteWebEventsOlderThan: (...args: unknown[]) => deleteWebEventsOlderThan(...args),
  findRecentFilterEvents: (...args: unknown[]) => findRecentFilterEvents(...args),
  findTopCategories: (...args: unknown[]) => findTopCategories(...args),
  findAnalyticsSummary: (...args: unknown[]) => findAnalyticsSummary(...args),
  findFunnel: (...args: unknown[]) => findFunnel(...args),
  findTopProducts: (...args: unknown[]) => findTopProducts(...args),
  findProductsViewedNotPurchased: (...args: unknown[]) => findProductsViewedNotPurchased(...args),
  findTopSearches: (...args: unknown[]) => findTopSearches(...args),
  findTrafficSources: (...args: unknown[]) => findTrafficSources(...args),
}))

const {
  DEFAULT_RETENTION_DAYS,
  SESSION_COOKIE,
  VISITOR_COOKIE,
  cleanupOldWebEvents,
  getWebAnalyticsRetentionDays,
  getTopFilters,
  trackWebHit,
  DEFAULT_ANALYTICS_WINDOW,
  getAnalyticsDashboard,
  parseAnalyticsWindow,
} = await import("../web-analytics.service")

const UUID = "0b5f5a6e-61f2-4f0e-9d0e-2f1f4b9a7c31"
const OTHER_UUID = "8c2b1d4a-55aa-4e3f-9a11-7d6c5e4f3b22"

beforeEach(() => {
  upsertWebVisitor.mockReset().mockResolvedValue({ id: "visitor-1" })
  createWebEvent.mockReset().mockResolvedValue({ id: "event-1" })
  deleteWebEventsOlderThan.mockReset().mockResolvedValue(0)
  findRecentFilterEvents.mockReset().mockResolvedValue([])
  findTopCategories.mockReset().mockResolvedValue([])
  findAnalyticsSummary.mockReset().mockResolvedValue({ visitors: 0, sessions: 0, events: 0, productViews: 0 })
  findFunnel.mockReset().mockResolvedValue({ productViewers: 0, checkoutStarters: 0, buyers: 0 })
  findTopProducts.mockReset().mockResolvedValue([])
  findProductsViewedNotPurchased.mockReset().mockResolvedValue([])
  findTopSearches.mockReset().mockResolvedValue([])
  findTrafficSources.mockReset().mockResolvedValue([])
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe("trackWebHit — primera visita", () => {
  it("siembra las dos cookies y guarda el primer toque", async () => {
    const result = await trackWebHit({
      path: "/hombre",
      query: "?utm_source=meta&utm_campaign=remarketing",
      referrer: "https://www.instagram.com/",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      visitorCookie: null,
      sessionCookie: null,
    })

    expect(result.cookiesToSet.map((cookie) => cookie.name)).toEqual([
      VISITOR_COOKIE,
      SESSION_COOKIE,
    ])
    // La de visitante dura un año; la de sesión muere con la ventana.
    expect(result.cookiesToSet[0].maxAge).toBe(60 * 60 * 24 * 365)
    expect(result.cookiesToSet[1].maxAge).toBeUndefined()

    expect(upsertWebVisitor).toHaveBeenCalledWith(
      expect.objectContaining({
        landingPath: "/hombre",
        referrer: "https://www.instagram.com/",
        device: "mobile",
        utm: expect.objectContaining({ source: "meta", campaign: "remarketing" }),
      }),
    )
  })
})

describe("trackWebHit — visitante que vuelve", () => {
  it("reutiliza las cookies y no pisa el primer toque", async () => {
    const result = await trackWebHit({
      path: "/productos/tenis-one-star",
      visitorCookie: UUID,
      sessionCookie: OTHER_UUID,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      referrer: "https://google.com",
    })

    expect(result.cookiesToSet).toHaveLength(0)
    expect(upsertWebVisitor).toHaveBeenCalledWith(
      expect.objectContaining({ anonId: UUID, landingPath: null, referrer: null }),
    )
    expect(createWebEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        visitorId: "visitor-1",
        sessionId: OTHER_UUID,
        type: "PRODUCT_VIEW",
        productSlug: "tenis-one-star",
      }),
    )
  })

  it("descarta una cookie manipulada y entrega una nueva", async () => {
    const result = await trackWebHit({
      path: "/",
      visitorCookie: "'; DROP TABLE WebEvent; --",
      sessionCookie: "cualquier-cosa",
    })

    const nuevas = result.cookiesToSet.map((cookie) => cookie.name)
    expect(nuevas).toContain(VISITOR_COOKIE)
    expect(nuevas).toContain(SESSION_COOKIE)
    expect(upsertWebVisitor).toHaveBeenCalledWith(
      expect.objectContaining({ anonId: expect.not.stringContaining("DROP") }),
    )
  })
})

describe("trackWebHit — clasificación", () => {
  it("guarda los filtros aplicados en el catálogo", async () => {
    await trackWebHit({
      path: "/mujer",
      query: "?talla=38&color=negro",
      visitorCookie: UUID,
      sessionCookie: OTHER_UUID,
    })

    expect(createWebEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "FILTER_APPLY",
        categorySlug: "mujer",
        filters: { talla: "38", color: "negro" },
      }),
    )
  })

  it("no manda `filters` cuando no hay ninguno", async () => {
    await trackWebHit({ path: "/club", visitorCookie: UUID, sessionCookie: OTHER_UUID })

    expect(createWebEvent).toHaveBeenCalledWith(
      expect.objectContaining({ filters: undefined }),
    )
  })
})

describe("getTopFilters", () => {
  it("cuenta cada valor por separado y ordena por uso", async () => {
    findRecentFilterEvents.mockResolvedValue([
      { filters: { talla: "38", color: "negro" } },
      { filters: { talla: "38" } },
      { filters: { color: "negro,blanco" } },
      { filters: null },
      { filters: "no es un objeto" },
    ])

    const top = await getTopFilters(30, 10)

    expect(top[0]).toEqual({ key: "talla", value: "38", uses: 2 })
    expect(top).toContainEqual({ key: "color", value: "negro", uses: 2 })
    expect(top).toContainEqual({ key: "color", value: "blanco", uses: 1 })
  })

  it("aguanta que no haya datos todavía", async () => {
    findRecentFilterEvents.mockResolvedValue([])

    await expect(getTopFilters()).resolves.toEqual([])
  })
})

describe("cleanupOldWebEvents", () => {
  it("usa DEFAULT_RETENTION_DAYS (180) cuando no hay variable de entorno", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-20T12:00:00.000Z"))
    vi.stubEnv("WEB_ANALYTICS_RETENTION_DAYS", "")
    deleteWebEventsOlderThan.mockResolvedValue(15)

    const deleted = await cleanupOldWebEvents()

    expect(deleted).toBe(15)
    expect(getWebAnalyticsRetentionDays()).toBe(DEFAULT_RETENTION_DAYS)
    const expectedCutoff = new Date(
      Date.UTC(2026, 10, 20, 12, 0, 0) - 180 * 24 * 60 * 60 * 1000,
    )
    expect(deleteWebEventsOlderThan).toHaveBeenCalledWith(expectedCutoff)
  })

  it("respeta WEB_ANALYTICS_RETENTION_DAYS cuando es un entero positivo", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-20T12:00:00.000Z"))
    vi.stubEnv("WEB_ANALYTICS_RETENTION_DAYS", "90")
    deleteWebEventsOlderThan.mockResolvedValue(8)

    const deleted = await cleanupOldWebEvents()

    expect(deleted).toBe(8)
    expect(getWebAnalyticsRetentionDays()).toBe(90)
    const expectedCutoff = new Date(
      Date.UTC(2026, 10, 20, 12, 0, 0) - 90 * 24 * 60 * 60 * 1000,
    )
    expect(deleteWebEventsOlderThan).toHaveBeenCalledWith(expectedCutoff)
  })

  it("cae al default si WEB_ANALYTICS_RETENTION_DAYS es inválido o no positivo", async () => {
    vi.stubEnv("WEB_ANALYTICS_RETENTION_DAYS", "-5")
    expect(getWebAnalyticsRetentionDays()).toBe(DEFAULT_RETENTION_DAYS)

    vi.stubEnv("WEB_ANALYTICS_RETENTION_DAYS", "abc")
    expect(getWebAnalyticsRetentionDays()).toBe(DEFAULT_RETENTION_DAYS)
  })
})

describe("parseAnalyticsWindow", () => {
  it("acepta solo las ventanas permitidas", () => {
    expect(parseAnalyticsWindow("1")).toBe(1)
    expect(parseAnalyticsWindow("7")).toBe(7)
    expect(parseAnalyticsWindow("30")).toBe(30)
  })

  it("cae en la ventana por defecto con basura, vacío o valores fuera de lista", () => {
    for (const entrada of [undefined, null, "", "abc", "0", "-7", "365", "7; DROP TABLE"]) {
      expect(parseAnalyticsWindow(entrada)).toBe(DEFAULT_ANALYTICS_WINDOW)
    }
  })
})

describe("getAnalyticsDashboard", () => {
  it("calcula los porcentajes del embudo", async () => {
    findFunnel.mockResolvedValue({ productViewers: 200, checkoutStarters: 50, buyers: 10 })

    const panel = await getAnalyticsDashboard(7)

    expect(panel.funnel.viewToCheckout).toBe(25)
    expect(panel.funnel.checkoutToPurchase).toBe(20)
    expect(panel.funnel.viewToPurchase).toBe(5)
  })

  it("no divide por cero cuando no hay datos", async () => {
    findFunnel.mockResolvedValue({ productViewers: 0, checkoutStarters: 0, buyers: 0 })

    const panel = await getAnalyticsDashboard(7)

    expect(panel.funnel.viewToCheckout).toBe(0)
    expect(panel.funnel.checkoutToPurchase).toBe(0)
    expect(panel.funnel.viewToPurchase).toBe(0)
  })

  it("pide todas las secciones con la misma ventana", async () => {
    await getAnalyticsDashboard(30)

    expect(findAnalyticsSummary).toHaveBeenCalledWith(30)
    expect(findFunnel).toHaveBeenCalledWith(30)
    expect(findTopProducts).toHaveBeenCalledWith(30, 10)
    expect(findProductsViewedNotPurchased).toHaveBeenCalledWith(30, 10)
    expect(findTopCategories).toHaveBeenCalledWith(30, 10)
    expect(findTopSearches).toHaveBeenCalledWith(30, 10)
    expect(findTrafficSources).toHaveBeenCalledWith(30, 10)
  })

  it("usa la ventana por defecto si no se pasa ninguna", async () => {
    await getAnalyticsDashboard()

    expect(findAnalyticsSummary).toHaveBeenCalledWith(DEFAULT_ANALYTICS_WINDOW)
  })
})
