import "server-only"
import { getLeadsData, type LeadFilterParams, type LeadStats } from "../repositories/lead.repository"

export type { LeadStats }

export interface LeadDTO {
  id: string
  email: string
  name: string
  phone: string | null
  source: string
  stage: string
  preferredBrand: string | null
  gender: string | null
  hasActiveCart: boolean
  cartItemCount: number
  estimatedValue: number
  createdAt: string
  lastInteraction: string
}

export interface GetLeadsResponse {
  leads: LeadDTO[]
  total: number
  stats: LeadStats
}

export async function getLeadsList(params: {
  q?: string
  source?: "ALL" | "CLUB" | "ABANDONED_CART" | "REGISTERED_NO_ORDER"
  hasPhone?: boolean
  page?: number
  pageSize?: number
}): Promise<GetLeadsResponse> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.max(1, params.pageSize ?? 25)
  const skip = (page - 1) * pageSize

  const filter: LeadFilterParams = {
    q: params.q,
    source: params.source,
    hasPhone: params.hasPhone,
    take: pageSize,
    skip,
  }

  const result = await getLeadsData(filter)

  return {
    leads: result.leads,
    total: result.total,
    stats: result.stats,
  }
}

/** Neutraliza fórmulas maliciosas de Excel/Calc (CWE-1236) y escapa comillas dobles. */
function csvCell(value: string | null | undefined): string {
  if (!value) return '""'
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

/**
 * Genera contenido en formato CSV para exportar leads hacia campañas de WhatsApp o CRM externo.
 */
export async function exportLeadsToCsv(): Promise<string> {
  const result = await getLeadsData({ take: 5000, skip: 0 })
  const headers = ["ID", "Email", "Nombre", "Telefono", "Origen", "Etapa", "Marca Preferida", "Genero", "Items en Carrito", "Valor Estimado", "Fecha Registro"]

  const rows = result.leads.map((l) => [
    csvCell(l.id),
    csvCell(l.email),
    csvCell(l.name),
    csvCell(l.phone),
    csvCell(l.source),
    csvCell(l.stage),
    csvCell(l.preferredBrand),
    csvCell(l.gender),
    l.cartItemCount,
    l.estimatedValue,
    csvCell(l.createdAt),
  ])

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
}
