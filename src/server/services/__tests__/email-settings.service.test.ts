import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const repo = vi.hoisted(() => ({
  findEmailTemplateSetting: vi.fn(),
  findAllEmailTemplateSettings: vi.fn(),
  upsertEmailTemplateSetting: vi.fn(),
}))
vi.mock("@/server/repositories/email-template-setting.repository", () => repo)
const sendEmail = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true, id: "e1" }))
vi.mock("@/server/email/resend.client", () => ({ sendEmail }))

import {
  getEmailSettings,
  listEmailTemplatesForAdmin,
  previewEmailTemplate,
  sendEmailTemplateTest,
  updateEmailTemplate,
} from "../email-settings.service"
import { EMAIL_CATALOG } from "@/server/email/catalog"

const row = (key: string, data: Partial<{ subject: string | null; intro: string | null; enabled: boolean }>) => ({
  key,
  subject: null,
  intro: null,
  enabled: true,
  updatedAt: new Date("2026-11-05T12:00:00Z"),
  ...data,
})

beforeEach(() => vi.clearAllMocks())

describe("getEmailSettings", () => {
  it("un correo que se puede apagar respeta el interruptor", async () => {
    repo.findEmailTemplateSetting.mockResolvedValue(row("login_alert", { enabled: false }))
    expect((await getEmailSettings("login_alert")).enabled).toBe(false)
  })

  it("un correo obligatorio sale aunque la fila diga apagado", async () => {
    repo.findEmailTemplateSetting.mockResolvedValue(row("order_confirmation", { enabled: false, subject: "Hola" }))
    expect(await getEmailSettings("order_confirmation")).toEqual({ enabled: true, copy: { subject: "Hola", intro: null } })
  })

  it("si la base falla, el correo sale con los textos del código", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    repo.findEmailTemplateSetting.mockRejectedValue(new Error("db caída"))
    expect(await getEmailSettings("order_shipped")).toEqual({ enabled: true, copy: { subject: undefined, intro: undefined } })
  })

  it("la bienvenida al club no toma textos de aquí (se editan en Configuración)", async () => {
    repo.findEmailTemplateSetting.mockResolvedValue(row("club_welcome", { subject: "otro" }))
    expect((await getEmailSettings("club_welcome")).copy).toEqual({})
  })
})

describe("updateEmailTemplate", () => {
  it("guarda asunto y texto recortados; vacío queda null", async () => {
    await updateEmailTemplate({ key: "order_shipped", subject: "  Va en camino  ", intro: "   ", enabled: false })
    expect(repo.upsertEmailTemplateSetting).toHaveBeenCalledWith("order_shipped", {
      subject: "Va en camino",
      intro: null,
      enabled: false,
    })
  })

  it("no deja apagar un correo obligatorio", async () => {
    await updateEmailTemplate({ key: "pqrs_confirmation", subject: "", intro: "", enabled: false })
    expect(repo.upsertEmailTemplateSetting).toHaveBeenCalledWith("pqrs_confirmation", expect.objectContaining({ enabled: true }))
  })

  it("rechaza un correo que no existe o un asunto muy largo", async () => {
    await expect(updateEmailTemplate({ key: "otro", enabled: true })).rejects.toThrow()
    await expect(updateEmailTemplate({ key: "login_alert", subject: "x".repeat(151), enabled: true })).rejects.toThrow()
    expect(repo.upsertEmailTemplateSetting).not.toHaveBeenCalled()
  })
})

describe("admin", () => {
  it("lista todos los correos del catálogo con su estado", async () => {
    repo.findAllEmailTemplateSettings.mockResolvedValue([row("login_alert", { enabled: false, subject: "Ojo" })])
    const items = await listEmailTemplatesForAdmin()
    expect(items).toHaveLength(EMAIL_CATALOG.length)
    expect(items.find((i) => i.key === "login_alert")).toMatchObject({ enabled: false, subject: "Ojo" })
    expect(items.find((i) => i.key === "order_confirmation")).toMatchObject({ enabled: true, subject: "", toggleable: false })
  })

  it("todas las plantillas del catálogo se pueden previsualizar", () => {
    for (const entry of EMAIL_CATALOG) {
      const { subject, html } = previewEmailTemplate({ key: entry.key })
      expect(subject.length).toBeGreaterThan(0)
      expect(html).toContain("ONE STAR")
    }
  })

  it("la prueba manda la versión guardada con [PRUEBA] en el asunto", async () => {
    repo.findEmailTemplateSetting.mockResolvedValue(row("order_shipped", { subject: "Asunto guardado" }))
    await sendEmailTemplateTest({ key: "order_shipped", to: "Admin@Tienda.com" })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "admin@tienda.com", subject: "[PRUEBA] Asunto guardado" })
    )
  })
})
