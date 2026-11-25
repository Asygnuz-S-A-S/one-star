import Link from "next/link"
import { getAdminSession } from "@/server/auth/require-admin"
import {
  getLeadsList,
  getWhatsappBotGlobalEnabled,
} from "@/server/services/lead.service"
import LeadsManager from "@/components/admin/LeadsManager"

export const metadata = {
  title: "Gestión de Leads y Prospectos CRM | Admin One Star",
}

interface SearchParams {
  q?: string
  source?: "ALL" | "WHATSAPP" | "CLUB" | "ABANDONED_CART" | "REGISTERED_NO_ORDER"
  stage?: string
  utm?: string
  tag?: string
  hasPhone?: string
  needsHuman?: string
  page?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function AdminLeadsPage({ searchParams }: Props) {
  const params = await searchParams
  const q = params.q?.trim() ?? ""
  const source = params.source ?? "ALL"
  const stage = params.stage?.trim() || undefined
  const utm = params.utm?.trim() || undefined
  const tag = params.tag?.trim() || undefined
  const hasPhone = params.hasPhone === "true"
  const needsHumanOnly = params.needsHuman === "true"
  const page = Math.max(1, parseInt(params.page ?? "1") || 1)
  const pageSize = 25

  const [{ leads, total, stats, availableTags }, botGlobalEnabled, session] = await Promise.all([
    getLeadsList({
      q,
      source,
      stage,
      utm,
      tag,
      hasPhone,
      needsHumanOnly,
      page,
      pageSize,
    }),
    getWhatsappBotGlobalEnabled(),
    getAdminSession(),
  ])

  const canToggleGlobalBot = session?.user?.adminRole === "SUPER_ADMIN"
  // El CSV es una exportación masiva de datos de clientes: solo Super Admin (la ruta también lo exige).
  const canExportLeads = canToggleGlobalBot
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const exportParams = new URLSearchParams()
  if (q) exportParams.set("q", q)
  if (source && source !== "ALL") exportParams.set("source", source)
  if (stage && stage !== "ALL") exportParams.set("stage", stage)
  if (utm) exportParams.set("utm", utm)
  if (tag && tag !== "ALL") exportParams.set("tag", tag)
  if (hasPhone) exportParams.set("hasPhone", "true")
  if (needsHumanOnly) exportParams.set("needsHuman", "true")
  const exportQuery = exportParams.toString()
  const exportHref = exportQuery ? `/api/admin/leads/export?${exportQuery}` : "/api/admin/leads/export"
  const hasExportFilters = exportQuery.length > 0

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Barlow',sans-serif] text-2xl md:text-3xl font-bold text-[#1C1C1C]">
            Gestión de Leads & Prospectos (CRM)
          </h1>
          <p className="text-sm text-[#4A4A4A] mt-1">
            Prospectos de WhatsApp con atribución UTM, socios One Star Club y carritos abandonados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canExportLeads && (
          <a
            href={exportHref}
            download
            className="inline-flex min-h-11 items-center gap-2 bg-white border border-gray-200 text-[#1C1C1C] hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-2xs"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {hasExportFilters ? `Exportar filtrados (${total}) CSV` : "Exportar Leads (CSV)"}
          </a>
          )}

          <Link
            href="/admin/clientes"
            className="inline-flex min-h-11 items-center text-sm text-[#4A4A4A] border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 rounded-lg transition-colors"
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
        stage={stage ?? "ALL"}
        utm={utm ?? ""}
        tag={tag ?? "ALL"}
        availableTags={availableTags ?? []}
        hasPhone={hasPhone}
        needsHumanOnly={needsHumanOnly}
        initialBotGlobalEnabled={botGlobalEnabled}
        canToggleGlobalBot={canToggleGlobalBot}
      />
    </div>
  )
}
