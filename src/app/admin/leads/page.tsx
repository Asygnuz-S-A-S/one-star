import Link from "next/link"
import { getLeadsList } from "@/server/services/lead.service"
import LeadsManager from "@/components/admin/LeadsManager"

export const metadata = {
  title: "Gestión de Leads y Prospectos CRM | Admin One Star",
}

interface SearchParams {
  q?: string
  source?: "ALL" | "CLUB" | "ABANDONED_CART" | "REGISTERED_NO_ORDER"
  hasPhone?: string
  page?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function AdminLeadsPage({ searchParams }: Props) {
  const params = await searchParams
  const q = params.q?.trim() ?? ""
  const source = params.source ?? "ALL"
  const hasPhone = params.hasPhone === "true"
  const page = Math.max(1, parseInt(params.page ?? "1") || 1)
  const pageSize = 25

  const { leads, total, stats } = await getLeadsList({
    q,
    source,
    hasPhone,
    page,
    pageSize,
  })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Barlow',sans-serif] text-2xl md:text-3xl font-bold text-[#1C1C1C]">
            Gestión de Leads & Prospectos (CRM)
          </h1>
          <p className="text-sm text-[#4A4A4A] mt-1">
            Contactos registrados, carritos abandonados e interesados en marcas sin compra completada.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/admin/leads/export"
            download
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-[#1C1C1C] hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-2xs"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar Leads (CSV)
          </a>

          <Link
            href="/admin/clientes"
            className="text-sm text-[#4A4A4A] border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 rounded-lg transition-colors"
          >
            Ver Clientes Compradores →
          </Link>
        </div>
      </div>

      <LeadsManager
        initialLeads={leads}
        total={total}
        stats={stats}
        page={page}
        totalPages={totalPages}
        q={q}
        source={source}
        hasPhone={hasPhone}
      />
    </div>
  )
}
