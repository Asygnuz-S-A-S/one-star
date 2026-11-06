import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const repo = vi.hoisted(() => ({
  findCustomersForMarketing: vi.fn(),
  findConsentedGuestOrders: vi.fn(),
  findPaidOrdersForMarketing: vi.fn(),
}))
vi.mock("@/server/repositories/marketing.repository", () => repo)
const resendClient = vi.hoisted(() => ({ value: null as unknown }))
vi.mock("@/server/email/resend.client", () => ({ getResendClient: () => resendClient.value }))

import {
  BRAND_SEGMENT_PREFIX,
  SEGMENT,
  buildMarketingAudience,
  countBySegment,
  syncMarketingToResend,
  unsubscribeMarketingContact,
} from "../marketing.service"

const NOW = new Date("2026-11-05T12:00:00Z")
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000)
const customer = (email: string, consent: boolean, extra: Partial<{ name: string; lastName: string; clubMember: boolean }> = {}) => ({
  email,
  name: extra.name ?? null,
  lastName: extra.lastName ?? null,
  clubMember: extra.clubMember ?? false,
  marketingConsentAt: consent ? daysAgo(10) : null,
})
const paid = (email: string, total: number, when: Date, brands: string[]) => ({
  customerEmail: email,
  total,
  paidAt: when,
  createdAt: when,
  user: null,
  items: brands.map((name) => ({ product: { brand: { name } } })),
})

beforeEach(() => {
  vi.clearAllMocks()
  resendClient.value = null
})

describe("buildMarketingAudience", () => {
  it("solo incluye a quien aceptó publicidad, y la cuenta manda sobre sus compras como invitado", () => {
    const audience = buildMarketingAudience({
      customers: [customer("si@x.co", true, { name: "Ana" }), customer("NO@x.co", false)],
      guestOrders: [
        { customerEmail: "no@x.co", customerName: "No Quiere" }, // tiene cuenta sin consentimiento
        { customerEmail: "Invitada@x.co", customerName: "Luisa María Pérez" },
      ],
      paidOrders: [],
      now: NOW,
    })
    expect(audience.map((c) => c.email)).toEqual(["invitada@x.co", "si@x.co"])
    expect(audience[0]).toMatchObject({ firstName: "Luisa", lastName: "María Pérez", club: false })
  })

  it("calcula compras, total, última compra, marcas y segmentos", () => {
    const [c] = buildMarketingAudience({
      customers: [customer("ana@x.co", true, { clubMember: true })],
      guestOrders: [],
      paidOrders: [
        paid("ANA@x.co", 300000, daysAgo(120), ["HOKA"]),
        paid("ana@x.co", 199900.5, daysAgo(100), ["Adidas", "HOKA"]),
        paid("otra@x.co", 50000, daysAgo(1), ["Nike"]),
      ],
      now: NOW,
    })
    expect(c).toMatchObject({ orders: 2, totalSpent: 499901, lastPurchase: daysAgo(100).toISOString().slice(0, 10), brands: ["Adidas", "HOKA"] })
    expect(c.segments).toEqual([
      SEGMENT.newsletter,
      SEGMENT.club,
      SEGMENT.buyers,
      SEGMENT.inactive,
      `${BRAND_SEGMENT_PREFIX}Adidas`,
      `${BRAND_SEGMENT_PREFIX}HOKA`,
    ])
  })

  it("quien nunca compró va a «Sin compras»; quien compró hace poco no es inactivo", () => {
    const audience = buildMarketingAudience({
      customers: [customer("nueva@x.co", true), customer("activa@x.co", true)],
      guestOrders: [],
      paidOrders: [paid("activa@x.co", 1000, daysAgo(5), [])],
      now: NOW,
    })
    const counts = Object.fromEntries(countBySegment(audience).map((s) => [s.name, s.count]))
    expect(counts[SEGMENT.noPurchase]).toBe(1)
    expect(counts[SEGMENT.buyers]).toBe(1)
    expect(counts[SEGMENT.inactive]).toBe(0)
    expect(counts[SEGMENT.newsletter]).toBe(2)
  })

  it("usa el correo de la cuenta cuando el pedido no guardó correo", () => {
    const [c] = buildMarketingAudience({
      customers: [customer("ana@x.co", true)],
      guestOrders: [],
      paidOrders: [{ ...paid("x", 1000, daysAgo(1), []), customerEmail: null, user: { email: "ana@x.co" } }],
      now: NOW,
    })
    expect(c.orders).toBe(1)
  })
})

/** Cliente de Resend falso: guarda segmentos y contactos en memoria. */
function fakeResend(state: {
  segments: { id: string; name: string }[]
  members: Record<string, { id: string; email: string; unsubscribed: boolean }[]>
  contacts: { id: string; email: string; unsubscribed: boolean }[]
}) {
  const ok = <T,>(data: T) => Promise.resolve({ data, error: null })
  return {
    contactProperties: {
      list: vi.fn(() => ok({ data: [{ key: "es_club" }], has_more: false })),
      create: vi.fn(() => ok({ id: "p" })),
    },
    segments: {
      list: vi.fn(() => ok({ data: state.segments, has_more: false })),
      create: vi.fn(({ name }: { name: string }) => ok({ id: `seg-${name}`, name })),
    },
    contacts: {
      imports: { create: vi.fn((options: { file: Blob }) => ok({ id: "imp", bytes: options.file.size })) },
      list: vi.fn((opts: { segmentId?: string }) =>
        ok({ data: opts.segmentId ? (state.members[opts.segmentId] ?? []) : state.contacts, has_more: false })
      ),
      segments: { remove: vi.fn(() => ok({ id: "r" })) },
      update: vi.fn(() => ok({ id: "u" })),
    },
  }
}

describe("syncMarketingToResend", () => {
  it("sin clave de Resend avisa en vez de fallar en silencio", async () => {
    await expect(syncMarketingToResend()).rejects.toThrow("RESEND_API_KEY")
  })

  it("crea lo que falta, importa por segmento, saca a quien ya no aplica y da de baja a quien no consintió", async () => {
    repo.findCustomersForMarketing.mockResolvedValue([customer("ana@x.co", true, { clubMember: false })])
    repo.findConsentedGuestOrders.mockResolvedValue([])
    repo.findPaidOrdersForMarketing.mockResolvedValue([])
    const resend = fakeResend({
      segments: [
        { id: "s-news", name: SEGMENT.newsletter },
        { id: "s-club", name: SEGMENT.club },
        { id: "s-ajeno", name: "Lista manual de Jesi" },
      ],
      members: {
        "s-club": [{ id: "c1", email: "ana@x.co", unsubscribed: false }], // ya no es del club
        "s-news": [{ id: "c1", email: "ana@x.co", unsubscribed: false }],
      },
      contacts: [
        { id: "c1", email: "ana@x.co", unsubscribed: false },
        { id: "c2", email: "retiro@x.co", unsubscribed: false },
        { id: "c3", email: "yabaja@x.co", unsubscribed: true },
      ],
    })
    resendClient.value = resend

    const result = await syncMarketingToResend()

    // Propiedades: crea las 4 que faltan.
    expect(resend.contactProperties.create).toHaveBeenCalledTimes(4)
    // Segmentos: crea «Sin compras» (no existía) y no toca la lista ajena.
    expect(resend.segments.create).toHaveBeenCalledWith({ name: SEGMENT.noPurchase })
    // Importa un CSV por segmento con miembros.
    expect(resend.contacts.imports.create).toHaveBeenCalledTimes(2)
    const csv = await resend.contacts.imports.create.mock.calls[0][0].file.text()
    expect(csv.split("\n")[1]).toBe("ana@x.co,,,no,0,0,,")
    // Ana sale del club; nada se toca en la lista ajena.
    expect(resend.contacts.segments.remove).toHaveBeenCalledTimes(1)
    expect(resend.contacts.segments.remove).toHaveBeenCalledWith({ email: "ana@x.co", segmentId: "s-club" })
    // Solo se da de baja a quien no tiene consentimiento y seguía suscrito.
    expect(resend.contacts.update).toHaveBeenCalledTimes(1)
    expect(resend.contacts.update).toHaveBeenCalledWith({ email: "retiro@x.co", unsubscribed: true })
    expect(result).toMatchObject({ contacts: 1, removedFromSegments: 1, unsubscribed: 1 })
  })

  it("reintenta cuando Resend limita las solicitudes", async () => {
    vi.useFakeTimers()
    repo.findCustomersForMarketing.mockResolvedValue([])
    repo.findConsentedGuestOrders.mockResolvedValue([])
    repo.findPaidOrdersForMarketing.mockResolvedValue([])
    const resend = fakeResend({ segments: [], members: {}, contacts: [] })
    resend.contactProperties.list
      .mockResolvedValueOnce({ data: null, error: { name: "rate_limit_exceeded", message: "slow down" } } as never)
    resendClient.value = resend

    const pending = syncMarketingToResend()
    await vi.runAllTimersAsync()
    await expect(pending).resolves.toMatchObject({ contacts: 0 })
    expect(resend.contactProperties.list).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe("unsubscribeMarketingContact", () => {
  it("sin Resend configurado no hace nada", async () => {
    await expect(unsubscribeMarketingContact("a@x.co")).resolves.toBeUndefined()
  })

  it("marca la baja; si el contacto nunca se sincronizó no es error", async () => {
    const update = vi.fn().mockResolvedValue({ data: null, error: { name: "not_found", message: "no" } })
    resendClient.value = { contacts: { update } }
    await expect(unsubscribeMarketingContact(" Ana@X.co ")).resolves.toBeUndefined()
    expect(update).toHaveBeenCalledWith({ email: "ana@x.co", unsubscribed: true })

    update.mockResolvedValue({ data: null, error: { name: "application_error", message: "caído" } })
    await expect(unsubscribeMarketingContact("ana@x.co")).rejects.toThrow("caído")
  })
})

describe("CSV hacia Resend", () => {
  it("quita los caracteres que convertirían un nombre en fórmula de Excel", async () => {
    repo.findCustomersForMarketing.mockResolvedValue([customer("x@x.co", true, { name: "=HYPERLINK(\"http://malo\")", lastName: "+Pérez" })])
    repo.findConsentedGuestOrders.mockResolvedValue([])
    repo.findPaidOrdersForMarketing.mockResolvedValue([])
    const resend = fakeResend({ segments: [], members: {}, contacts: [] })
    resendClient.value = resend
    await syncMarketingToResend()
    const csv = await resend.contacts.imports.create.mock.calls[0][0].file.text()
    expect(csv.split("\n")[1]).toBe('x@x.co,"HYPERLINK(""http://malo"")",Pérez,no,0,0,,')
  })
})
