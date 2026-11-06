import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }))
const mockGetSession = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mockGetSession } } }))
const mockRole = vi.hoisted(() => vi.fn())
vi.mock("@/server/services/admin-role.service", () => ({ resolveActiveAdminRole: mockRole }))
const services = vi.hoisted(() => ({
  syncMarketingToResend: vi.fn().mockResolvedValue({ contacts: 1, segments: [], removedFromSegments: 0, unsubscribed: 0 }),
  updateEmailTemplate: vi.fn(),
  previewEmailTemplate: vi.fn().mockReturnValue({ subject: "s", html: "h" }),
  sendEmailTemplateTest: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock("@/server/services/marketing.service", () => ({ syncMarketingToResend: services.syncMarketingToResend }))
vi.mock("@/server/services/email-settings.service", () => ({
  updateEmailTemplate: services.updateEmailTemplate,
  previewEmailTemplate: services.previewEmailTemplate,
  sendEmailTemplateTest: services.sendEmailTemplateTest,
}))

import {
  previewEmailTemplateAction,
  saveEmailTemplateAction,
  sendEmailTemplateTestAction,
  syncMarketingAction,
} from "./actions"

const asAdmin = (role: string) => {
  mockGetSession.mockResolvedValue({ session: { id: "s" }, user: { id: "adm", email: "a@x.co", userType: "admin", adminRole: role } })
  mockRole.mockResolvedValue(role)
}
const callAll = () => [
  syncMarketingAction(),
  saveEmailTemplateAction({ key: "login_alert", enabled: false }),
  previewEmailTemplateAction({ key: "login_alert" }),
  sendEmailTemplateTestAction({ key: "login_alert", to: "a@x.co" }),
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("Email marketing: solo Super Admin", () => {
  it.each(["SALES_OPERATOR", "INVENTORY_OPERATOR"])("%s no puede usar ninguna acción aunque llame directo", async (role) => {
    asAdmin(role)
    for (const result of await Promise.all(callAll())) expect(result.success).toBe(false)
    for (const fn of Object.values(services)) expect(fn).not.toHaveBeenCalled()
  })

  it("sin sesión de admin tampoco", async () => {
    mockGetSession.mockResolvedValue(null)
    for (const result of await Promise.all(callAll())) expect(result.success).toBe(false)
    expect(services.syncMarketingToResend).not.toHaveBeenCalled()
  })

  it("un Super Admin sí puede", async () => {
    asAdmin("SUPER_ADMIN")
    for (const result of await Promise.all(callAll())) expect(result.success).toBe(true)
    expect(services.syncMarketingToResend).toHaveBeenCalledTimes(1)
  })
})
