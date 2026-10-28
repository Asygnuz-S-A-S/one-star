import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/lead.repository", () => ({
  getLeadsData: vi.fn(),
}))

import { getLeadsList, exportLeadsToCsv } from "../lead.service"
import { getLeadsData } from "@/server/repositories/lead.repository"

const mockGetLeadsData = vi.mocked(getLeadsData)

describe("lead.service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calcula paginación por defecto y delega a getLeadsData", async () => {
    mockGetLeadsData.mockResolvedValueOnce({
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

    expect(mockGetLeadsData).toHaveBeenCalledWith({
      q: "carlos",
      source: "CLUB",
      hasPhone: undefined,
      take: 10,
      skip: 10,
    })
    expect(result.total).toBe(1)
    expect(result.leads[0].email).toBe("carlos@test.com")
  })

  it("exportLeadsToCsv genera formato CSV sanitizando fórmulas maliciosas (CWE-1236)", async () => {
    mockGetLeadsData.mockResolvedValueOnce({
      leads: [
        {
          id: "usr_danger",
          email: "=cmd|' /C calc'!A0",
          name: "+Nombre Peligroso",
          phone: "@3000000000",
          source: "One Star Club",
          stage: "CLUB_REGISTRADO",
          preferredBrand: "-MarcaFormula",
          gender: "hombre",
          hasActiveCart: true,
          cartItemCount: 2,
          estimatedValue: 350000,
          createdAt: "2026-10-15T10:00:00.000Z",
          lastInteraction: "2026-10-15T10:00:00.000Z",
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
          createdAt: "2026-10-16T12:00:00.000Z",
          lastInteraction: "2026-10-16T12:00:00.000Z",
        },
      ],
      total: 2,
      stats: {
        totalLeads: 2,
        clubMembersCount: 1,
        abandonedCartsCount: 0,
        withPhoneCount: 2,
        convertedCustomersCount: 0,
      },
    })

    const csv = await exportLeadsToCsv()
    const lines = csv.split("\n")

    expect(lines[0]).toContain("ID,Email,Nombre,Telefono")

    // Verifica neutralización con comilla simple inicial en celdas con =, +, @, -
    expect(lines[1]).toContain(`"'=cmd|' /C calc'!A0"`)
    expect(lines[1]).toContain(`"'+Nombre Peligroso"`)
    expect(lines[1]).toContain(`"'@3000000000"`)
    expect(lines[1]).toContain(`"'-MarcaFormula"`)

    // Verifica escape de comillas dobles
    expect(lines[2]).toContain(`"Ana ""La Runner"""`)
  })
})
