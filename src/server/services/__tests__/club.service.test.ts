import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/server/repositories/user.repository", () => ({ findUserById: vi.fn(), updateUser: vi.fn() }))
vi.mock("@/server/repositories/coupon.repository", () => ({ findActiveClubCoupons: vi.fn() }))
vi.mock("@/server/services/email.service", () => ({ sendClubWelcomeEmail: vi.fn().mockResolvedValue({ ok: true }) }))

import { getClubPromotions, isClubMember, joinClub, setNewsletterConsent } from "../club.service"
import { findUserById, updateUser } from "@/server/repositories/user.repository"
import { findActiveClubCoupons } from "@/server/repositories/coupon.repository"
import { sendClubWelcomeEmail } from "@/server/services/email.service"

const baseUser = { id: "u1", email: "ana@example.com", name: "Ana", clubMember: false, clubJoinedAt: null, marketingConsentAt: null }

beforeEach(() => vi.clearAllMocks())

describe("joinClub", () => {
  it("une al club sin dar consentimiento de newsletter si no lo pidió, y envía bienvenida", async () => {
    vi.mocked(findUserById).mockResolvedValue(baseUser as never)
    vi.mocked(updateUser).mockImplementation(async (_id, data) => ({ ...baseUser, ...data }) as never)

    const status = await joinClub("u1", { newsletter: false })

    const data = vi.mocked(updateUser).mock.calls[0][1] as Record<string, unknown>
    expect(data.clubMember).toBe(true)
    expect(data.clubJoinedAt).toBeInstanceOf(Date)
    expect(data).not.toHaveProperty("marketingConsentAt")
    expect(status).toMatchObject({ isMember: true, newsletter: false })
    expect(sendClubWelcomeEmail).toHaveBeenCalledTimes(1)
  })

  it("registra el newsletter solo si lo acepta y no repite la bienvenida a quien ya es miembro", async () => {
    const joinedAt = new Date("2026-01-01")
    vi.mocked(findUserById).mockResolvedValue({ ...baseUser, clubMember: true, clubJoinedAt: joinedAt } as never)
    vi.mocked(updateUser).mockImplementation(async (_id, data) => ({ ...baseUser, clubMember: true, clubJoinedAt: joinedAt, ...data }) as never)

    const status = await joinClub("u1", { newsletter: true })

    const data = vi.mocked(updateUser).mock.calls[0][1] as Record<string, unknown>
    expect(data.clubJoinedAt).toBe(joinedAt)
    expect(data.marketingConsentAt).toBeInstanceOf(Date)
    expect(status.newsletter).toBe(true)
    expect(sendClubWelcomeEmail).not.toHaveBeenCalled()
  })
})

describe("setNewsletterConsent", () => {
  it("retirar el consentimiento lo deja en null", async () => {
    vi.mocked(updateUser).mockResolvedValue({ ...baseUser, marketingConsentAt: null } as never)
    await setNewsletterConsent("u1", false)
    expect(updateUser).toHaveBeenCalledWith("u1", { marketingConsentAt: null })
  })
})

describe("isClubMember", () => {
  it("sin usuario no es miembro", async () => {
    expect(await isClubMember(null)).toBe(false)
    expect(findUserById).not.toHaveBeenCalled()
  })
})

describe("getClubPromotions", () => {
  it("solo revela el código a miembros", async () => {
    const coupon = { code: "CLUB15", discountType: "PERCENTAGE", discountValue: 15, minOrderAmount: null, validUntil: new Date("2026-12-31") }
    vi.mocked(findActiveClubCoupons).mockResolvedValue([coupon] as never)

    expect((await getClubPromotions(false))[0].code).toBeNull()
    expect((await getClubPromotions(true))[0]).toMatchObject({ code: "CLUB15", discountValue: 15 })
  })
})
