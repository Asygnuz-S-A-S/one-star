import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const upsertWebVisitor = vi.fn()
const createWebEvent = vi.fn()
const deleteWebEventsOlderThan = vi.fn()
const findRecentFilterEvents = vi.fn()
const findTopCategories = vi.fn()

vi.mock("@/server/repositories/web-analytics.repository", () => ({
  upsertWebVisitor: (...args: unknown[]) => upsertWebVisitor(...args),
  createWebEvent: (...args: unknown[]) => createWebEvent(...args),
  deleteWebEventsOlderThan: (...args: unknown[]) => deleteWebEventsOlderThan(...args),
  findRecentFilterEvents: (...args: unknown[]) => findRecentFilterEvents(...args),
  findTopCategories: (...args: unknown[]) => findTopCategories(...args),
}))

const {
  DEFAULT_RETENTION_DAYS,
  SESSION_COOKIE,
  VISITOR_COOKIE,
  cleanupOldWebEvents,
  getWebAnalyticsRetentionDays,
  getTopFilters,
  trackWebHit,
} = await import("../web-analytics.service")

const UUID = "0b5f5a6e-61f2-4f0e-9d0e-2f1f4b9a7c31"
const OTHER_UUID = "8c2b1d4a-55aa-4e3f-9a11-7d6c5e4f3b22"

beforeEach(() => {
  upsertWebVisitor.mockReset().mockResolvedValue({ id: "visitor-1" })
  createWebEvent.mockReset().mockResolvedValue({ id: "event-1" })
  deleteWebEventsOlderThan.mockReset().mockResolvedValue(0)
  findRecentFilterEvents.mockReset().mockResolvedValue([])
  findTopCategories.mockReset().mockResolvedValue([])
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
