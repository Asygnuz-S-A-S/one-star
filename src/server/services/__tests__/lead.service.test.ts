import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

const repoMocks = vi.hoisted(() => ({
  getLeadsData: vi.fn(),
  findLeadById: vi.fn(),
  findLeadByPhone: vi.fn(),
  findLeadByShortCode: vi.fn(),
  upsertLeadRecord: vi.fn(),
  updateLeadStageRecord: vi.fn(),
  updateLeadShortLinkRecord: vi.fn(),
  updateLeadUtmRecord: vi.fn(),
  createLeadEventRecord: vi.fn(),
  attachLeadToOrderRecord: vi.fn(),
  findStaleLeadsForAbandonment: vi.fn(),
}))

vi.mock("@/server/repositories/lead.repository", () => repoMocks)

import {
  advanceStage,
  canAdvanceLeadStage,
  createShortLink,
  exportLeadsToCsv,
  getLeadsList,
  linkOrderToLead,
  markAbandonedLeads,
  recordLeadEvent,
  resolveShortLinkClick,
  upsertLeadByPhone,
} from "../lead.service"
import { normalizeWaPhone } from "@/server/validators/lead.validator"

describe("lead.service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repoMocks.createLeadEventRecord.mockResolvedValue({ id: "ev_1" })
  })

  describe("normalización de teléfono", () => {
    it("extrae únicamente dígitos de distintos formatos de WhatsApp", () => {
      expect(normalizeWaPhone("+57 (300) 123-4567")).toBe("573001234567")
      expect(normalizeWaPhone("300 123 4567")).toBe("3001234567")
      expect(normalizeWaPhone("whatsapp:+573109998877")).toBe("573109998877")
    })

    it("rechaza teléfonos con menos de 7 dígitos en upsertLeadByPhone", async () => {
      await expect(upsertLeadByPhone({ waPhone: "123" })).rejects.toThrow(/7 y 15 dígitos/)
    })
  })

  describe("upsertLeadByPhone (idempotente)", () => {
    it("crea o actualiza de forma idempotente por waPhone normalizado y registra evento", async () => {
      const now = new Date("2026-10-27T15:00:00Z")
      repoMocks.upsertLeadRecord.mockResolvedValue({
        id: "lead_1",
        waPhone: "573001234567",
        name: "Camila",
        stage: "NUEVO",
        ctwaClid: "ctwa_abc",
        consentAt: now,
        optedOut: false,
      })

      const first = await upsertLeadByPhone({
        waPhone: "+57 300 123-4567",
        name: "Camila",
        ctwaClid: "ctwa_abc",
        consent: true,
      })

      const second = await upsertLeadByPhone({
        waPhone: "573001234567",
        name: "Camila",
        ctwaClid: "ctwa_abc",
        consent: true,
      })

      expect(first).toEqual(second)
      expect(first.waPhone).toBe("573001234567")
      expect(repoMocks.upsertLeadRecord).toHaveBeenCalledTimes(2)
      expect(repoMocks.upsertLeadRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          waPhone: "573001234567",
          name: "Camila",
          ctwaClid: "ctwa_abc",
        })
      )
    })

    it("registra baja (OPT_OUT) cuando optedOut es true", async () => {
      repoMocks.upsertLeadRecord.mockResolvedValueOnce({
        id: "lead_optout",
        waPhone: "573009998877",
        name: null,
        stage: "NUEVO",
        ctwaClid: null,
        consentAt: null,
        optedOut: true,
      })

      const res = await upsertLeadByPhone({
        waPhone: "573009998877",
        optedOut: true,
      })

      expect(res.optedOut).toBe(true)
      expect(repoMocks.createLeadEventRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: "lead_optout",
          type: "OPT_OUT",
        })
      )
    })
  })

  describe("advanceStage (solo avanza, COMPRO no retrocede)", () => {
    it("permite avanzar en orden del embudo NUEVO -> INTERESADO -> CARRITO -> CHECKOUT -> COMPRO", () => {
      expect(canAdvanceLeadStage("NUEVO", "INTERESADO")).toBe(true)
      expect(canAdvanceLeadStage("INTERESADO", "CARRITO")).toBe(true)
      expect(canAdvanceLeadStage("CARRITO", "CHECKOUT")).toBe(true)
      expect(canAdvanceLeadStage("CHECKOUT", "ABANDONO")).toBe(true)
      expect(canAdvanceLeadStage("ABANDONO", "COMPRO")).toBe(true)
      expect(canAdvanceLeadStage("CHECKOUT", "COMPRO")).toBe(true)
    })

    it("no permite retroceder etapas ni salir de COMPRO", async () => {
      expect(canAdvanceLeadStage("CHECKOUT", "CARRITO")).toBe(false)
      expect(canAdvanceLeadStage("CARRITO", "INTERESADO")).toBe(false)
      expect(canAdvanceLeadStage("COMPRO", "ABANDONO")).toBe(false)
      expect(canAdvanceLeadStage("COMPRO", "CHECKOUT")).toBe(false)
      expect(canAdvanceLeadStage("COMPRO", "CARRITO")).toBe(false)
      expect(canAdvanceLeadStage("COMPRO", "NUEVO")).toBe(false)

      repoMocks.findLeadById.mockResolvedValueOnce({
        id: "lead_bought",
        waPhone: "573001112233",
        stage: "COMPRO",
      })

      const result = await advanceStage("lead_bought", "ABANDONO")
      expect(result?.stage).toBe("COMPRO")
      expect(repoMocks.updateLeadStageRecord).not.toHaveBeenCalled()
    })

    it("actualiza etapa y crea evento STAGE_CHANGE cuando el avance es válido", async () => {
      repoMocks.findLeadById.mockResolvedValueOnce({
        id: "lead_1",
        waPhone: "573001112233",
        stage: "INTERESADO",
      })
      repoMocks.updateLeadStageRecord.mockResolvedValueOnce({
        id: "lead_1",
        waPhone: "573001112233",
        stage: "CARRITO",
      })

      const updated = await advanceStage("lead_1", "CARRITO", { productId: "prod_1" })
      expect(updated?.stage).toBe("CARRITO")
      expect(repoMocks.updateLeadStageRecord).toHaveBeenCalledWith("lead_1", "CARRITO")
      expect(repoMocks.createLeadEventRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: "lead_1",
          type: "STAGE_CHANGE",
          stage: "CARRITO",
        })
      )
    })
  })

  describe("recordLeadEvent y linkOrderToLead", () => {
    it("registra evento filtrando campos sensibles y avanza etapa si aplica", async () => {
      repoMocks.findLeadByPhone.mockResolvedValueOnce({
        id: "lead_2",
        waPhone: "573001234567",
        stage: "NUEVO",
      })
      repoMocks.createLeadEventRecord.mockResolvedValueOnce({ id: "ev_99" })
      repoMocks.updateLeadStageRecord.mockResolvedValueOnce({
        id: "lead_2",
        waPhone: "573001234567",
        stage: "INTERESADO",
      })

      const res = await recordLeadEvent({
        waPhone: "+57 300 123 4567",
        type: "PRODUCT_QUERY",
        stage: "INTERESADO",
        metadata: { brand: "Vans", email: "secreto@test.com", cedula: "123456" },
      })

      expect(res).toEqual({
        eventId: "ev_99",
        leadId: "lead_2",
        stage: "INTERESADO",
      })
      expect(repoMocks.createLeadEventRecord).toHaveBeenCalledWith({
        leadId: "lead_2",
        type: "PRODUCT_QUERY",
        stage: "INTERESADO",
        metadata: { brand: "Vans" },
      })
    })

    it("vincula pedido al lead por teléfono cuando no hay cookie y avanza a COMPRO", async () => {
      repoMocks.findLeadById.mockResolvedValue(null)
      repoMocks.findLeadByPhone.mockResolvedValue({
        id: "lead_wa",
        waPhone: "573001234567",
        stage: "CHECKOUT",
      })
      repoMocks.attachLeadToOrderRecord.mockResolvedValueOnce({ id: "order_1", leadId: "lead_wa" })
      repoMocks.findLeadById.mockResolvedValueOnce({
        id: "lead_wa",
        waPhone: "573001234567",
        stage: "CHECKOUT",
      })
      repoMocks.updateLeadStageRecord.mockResolvedValueOnce({
        id: "lead_wa",
        waPhone: "573001234567",
        stage: "COMPRO",
      })

      const linked = await linkOrderToLead("order_1", {
        leadId: null,
        waPhone: "3001234567",
        advanceToStage: "COMPRO",
      })

      expect(repoMocks.attachLeadToOrderRecord).toHaveBeenCalledWith("order_1", "lead_wa")
      expect(linked?.stage).toBe("COMPRO")
    })
  })

  describe("createShortLink y resolveShortLinkClick", () => {
    it("crea enlace corto /r/<code> y avanza a INTERESADO", async () => {
      repoMocks.upsertLeadRecord.mockResolvedValueOnce({
        id: "lead_short",
        waPhone: "573001234567",
        stage: "NUEVO",
        shortCode: null,
      })
      repoMocks.updateLeadShortLinkRecord.mockResolvedValueOnce({})
      repoMocks.findLeadById.mockResolvedValueOnce({
        id: "lead_short",
        waPhone: "573001234567",
        stage: "NUEVO",
      })
      repoMocks.updateLeadStageRecord.mockResolvedValueOnce({
        id: "lead_short",
        waPhone: "573001234567",
        stage: "INTERESADO",
      })

      const res = await createShortLink({
        waPhone: "+57 300 123 4567",
        productSlug: "https://onestar.com.co/productos/vans-knu-skool",
        utmCampaign: "promo_octubre",
        baseUrl: "https://onestar.com.co",
      })

      expect(res.code).toHaveLength(8)
      expect(res.url).toBe(`https://onestar.com.co/r/${res.code}`)
      expect(repoMocks.updateLeadShortLinkRecord).toHaveBeenCalledWith(
        "lead_short",
        expect.objectContaining({
          productSlug: "vans-knu-skool",
          utmSource: "whatsapp",
          utmMedium: "asistente",
          utmCampaign: "promo_octubre",
        })
      )
    })

    it("resuelve enlace corto válido guardando UTM y registrando LINK_CLICK", async () => {
      repoMocks.findLeadByShortCode.mockResolvedValueOnce({
        id: "lead_click",
        waPhone: "573001234567",
        stage: "NUEVO",
        shortCode: "abc12345",
        productSlug: "vans-old-skool",
        utmCampaign: "camp_bot",
      })
      repoMocks.updateLeadUtmRecord.mockResolvedValueOnce({})
      repoMocks.findLeadById.mockResolvedValueOnce({
        id: "lead_click",
        waPhone: "573001234567",
        stage: "NUEVO",
      })
      repoMocks.updateLeadStageRecord.mockResolvedValueOnce({
        id: "lead_click",
        waPhone: "573001234567",
        stage: "INTERESADO",
      })

      const click = await resolveShortLinkClick("abc12345", {
        baseUrl: "https://onestar.com.co",
      })

      expect(click.found).toBe(true)
      expect(click.leadId).toBe("lead_click")
      expect(click.redirectUrl).toBe(
        "https://onestar.com.co/productos/vans-old-skool?utm_source=whatsapp&utm_medium=asistente&utm_campaign=camp_bot&utm_content=abc12345"
      )
      expect(repoMocks.createLeadEventRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: "lead_click",
          type: "LINK_CLICK",
        })
      )
    })

    it("redirige sin error cuando el shortCode no existe", async () => {
      repoMocks.findLeadByShortCode.mockResolvedValueOnce(null)

      const click = await resolveShortLinkClick("inexistente", {
        fallbackProductSlug: "adidas-samba",
        baseUrl: "https://onestar.com.co",
      })

      expect(click.found).toBe(false)
      expect(click.leadId).toBeNull()
      expect(click.redirectUrl).toContain("https://onestar.com.co/productos/adidas-samba")
    })
  })

  describe("markAbandonedLeads (24h sin pago)", () => {
    it("marca como ABANDONO los leads sin pago pasadas 24 horas", async () => {
      repoMocks.findStaleLeadsForAbandonment.mockResolvedValueOnce([
        { id: "lead_stale", stage: "CHECKOUT", waPhone: "573001112233" },
      ])
      repoMocks.findLeadById.mockResolvedValueOnce({
        id: "lead_stale",
        stage: "CHECKOUT",
        waPhone: "573001112233",
      })
      repoMocks.updateLeadStageRecord.mockResolvedValueOnce({
        id: "lead_stale",
        stage: "ABANDONO",
        waPhone: "573001112233",
      })

      const ids = await markAbandonedLeads(new Date("2026-10-28T12:00:00Z"))
      expect(ids).toEqual(["lead_stale"])
      expect(repoMocks.updateLeadStageRecord).toHaveBeenCalledWith("lead_stale", "ABANDONO")
    })
  })

  describe("getLeadsList y exportLeadsToCsv (sin bajas y sanitizado CWE-1236)", () => {
    it("calcula paginación por defecto y delega a getLeadsData", async () => {
      repoMocks.getLeadsData.mockResolvedValueOnce({
        leads: [
          {
            id: "usr_1",
            email: "carlos@test.com",
            name: "Carlos Gomez",
            phone: "3001234567",
            source: "One Star Club",
            stage: "CLUB_REGISTRADO",
            preferredBrand: "Nike",
            gender: "hombre",
            hasActiveCart: false,
            cartItemCount: 0,
            estimatedValue: 0,
            createdAt: new Date("2026-10-01").toISOString(),
            lastInteraction: new Date("2026-10-01").toISOString(),
          },
        ],
        total: 1,
        stats: {
          totalLeads: 1,
          clubMembersCount: 1,
          abandonedCartsCount: 0,
          withPhoneCount: 1,
          convertedCustomersCount: 5,
        },
      })

      const result = await getLeadsList({ page: 2, pageSize: 10, q: "carlos", source: "CLUB" })

      expect(repoMocks.getLeadsData).toHaveBeenCalledWith({
        q: "carlos",
        source: "CLUB",
        hasPhone: undefined,
        take: 10,
        skip: 10,
      })
      expect(result.total).toBe(1)
      expect(result.leads[0].email).toBe("carlos@test.com")
    })

    it("exportLeadsToCsv incluye waPhone, UTM y etapa, excluye bajas y sanitiza CWE-1236", async () => {
      repoMocks.getLeadsData.mockResolvedValueOnce({
        leads: [
          {
            id: "usr_danger",
            email: "=cmd|' /C calc'!A0",
            name: "+Nombre Peligroso",
            phone: "@3000000000",
            waPhone: "573000000000",
            source: "WhatsApp",
            stage: "INTERESADO",
            utmSource: "whatsapp",
            utmMedium: "asistente",
            utmCampaign: "camp_oct",
            utmContent: "abc12345",
            preferredBrand: "-MarcaFormula",
            gender: "hombre",
            hasActiveCart: true,
            cartItemCount: 2,
            estimatedValue: 350000,
            optedOut: false,
            createdAt: "2026-10-15T10:00:00.000Z",
            lastInteraction: "2026-10-15T10:00:00.000Z",
          },
          {
            id: "wa_opted_out",
            email: "",
            name: "Lead Dado De Baja",
            phone: "573110000000",
            waPhone: "573110000000",
            source: "WhatsApp",
            stage: "NUEVO",
            optedOut: true,
            preferredBrand: null,
            gender: null,
            hasActiveCart: false,
            cartItemCount: 0,
            estimatedValue: 0,
            createdAt: "2026-10-16T10:00:00.000Z",
            lastInteraction: "2026-10-16T10:00:00.000Z",
          },
          {
            id: "usr_clean",
            email: "ana@test.com",
            name: 'Ana "La Runner"',
            phone: "3109998877",
            source: "Registro Web",
            stage: "PROSPECTO",
            preferredBrand: "Adidas",
            gender: "mujer",
            hasActiveCart: false,
            cartItemCount: 0,
            estimatedValue: 0,
            optedOut: false,
            createdAt: "2026-10-16T12:00:00.000Z",
            lastInteraction: "2026-10-16T12:00:00.000Z",
          },
        ],
        total: 3,
        stats: {
          totalLeads: 3,
          clubMembersCount: 1,
          abandonedCartsCount: 0,
          withPhoneCount: 3,
          convertedCustomersCount: 0,
        },
      })

      const csv = await exportLeadsToCsv()
      const lines = csv.split("\n")

      expect(lines[0]).toContain("ID,Email,Nombre,Telefono,waPhone,Origen,Etapa,UTM Source,UTM Medium,UTM Campaign,UTM Content")
      // Excluye el lead dado de baja (solo encabezado + 2 filas activas)
      expect(lines).toHaveLength(3)
      expect(csv).not.toContain("Lead Dado De Baja")
      expect(csv).not.toContain("wa_opted_out")

      // Verifica neutralización CWE-1236 y presencia de waPhone/UTM
      expect(lines[1]).toContain(`"'=cmd|' /C calc'!A0"`)
      expect(lines[1]).toContain(`"'+Nombre Peligroso"`)
      expect(lines[1]).toContain(`"'@3000000000"`)
      expect(lines[1]).toContain(`"573000000000"`)
      expect(lines[1]).toContain(`"camp_oct"`)
      expect(lines[1]).toContain(`"'-MarcaFormula"`)

      // Verifica escape de comillas dobles
      expect(lines[2]).toContain(`"Ana ""La Runner"""`)
    })
  })
})
