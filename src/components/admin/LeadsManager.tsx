"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import type { LeadDTO, LeadStats } from "@/server/services/lead.service"

interface LeadsManagerProps {
  initialLeads: LeadDTO[]
  total: number
  stats: LeadStats
  page: number
  totalPages: number
  q: string
  source: string
  stage?: string
  utm?: string
  hasPhone: boolean
}

export default function LeadsManager({
  initialLeads,
  total,
  stats,
  page,
  totalPages,
  q,
  source,
  stage = "ALL",
  utm = "",
  hasPhone,
}: LeadsManagerProps) {
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)

  function formatCurrency(val: number) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val)
  }

  function getStageBadge(leadStage: string) {
    switch (leadStage) {
      case "COMPRO":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
            Compró
          </span>
        )
      case "CHECKOUT":
      case "CHECKOUT_INICIADO":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 border border-amber-200">
            Checkout
          </span>
        )
      case "CARRITO":
      case "CARRITO_ACTIVO":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 border border-blue-200">
            Carrito
          </span>
        )
      case "ABANDONO":
      case "CARRITO_ABANDONADO":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-800 border border-rose-200">
            Abandono
          </span>
        )
      case "INTERESADO":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
            Interesado
          </span>
        )
      case "NUEVO":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-teal-100 text-teal-800 border border-teal-200">
            Nuevo WA
          </span>
        )
      case "CLUB_REGISTRADO":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800 border border-purple-200">
            Socio Club
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-800 border border-gray-200">
            Prospecto
          </span>
        )
    }
  }

  function buildPageHref(targetPage: number): string {
    const params = new URLSearchParams()
    params.set("page", String(targetPage))
    if (q) params.set("q", q)
    if (source && source !== "ALL") params.set("source", source)
    if (stage && stage !== "ALL") params.set("stage", stage)
    if (utm) params.set("utm", utm)
    if (hasPhone) params.set("hasPhone", "true")
    return `/admin/leads?${params.toString()}`
  }

  const hasActiveFilters = Boolean(
    q || source !== "ALL" || (stage && stage !== "ALL") || utm || hasPhone
  )

  return (
    <div className="space-y-6">
      {/* Tarjetas de Métricas CRM */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs text-[#4A4A4A] uppercase font-bold tracking-wider">Total Leads</p>
          <p className="text-2xl font-bold text-[#1C1C1C] mt-1">{stats.totalLeads}</p>
          <p className="text-xs text-gray-400 mt-1">En el listado actual</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs text-teal-700 uppercase font-bold tracking-wider">WhatsApp Bot</p>
          <p className="text-2xl font-bold text-teal-900 mt-1">{stats.whatsappLeadsCount ?? 0}</p>
          <p className="text-xs text-teal-600 mt-1">Con UTM & etapas</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs text-purple-700 uppercase font-bold tracking-wider">Socios Club</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">{stats.clubMembersCount}</p>
          <p className="text-xs text-purple-500 mt-1">Alta afinidad de marca</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs text-rose-700 uppercase font-bold tracking-wider">Carritos Abandonados</p>
          <p className="text-2xl font-bold text-rose-900 mt-1">{stats.abandonedCartsCount}</p>
          <p className="text-xs text-rose-500 mt-1">Intención de compra</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs text-emerald-700 uppercase font-bold tracking-wider">Con Teléfono</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.withPhoneCount}</p>
          <p className="text-xs text-emerald-500 mt-1">Listos para WhatsApp</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs text-blue-700 uppercase font-bold tracking-wider">Clientes Convertidos</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.convertedCustomersCount}</p>
          <p className="text-xs text-blue-500 mt-1">Con orden pagada</p>
        </div>
      </div>

      {/* Barra de Filtros (controles >= 44px para móvil según PR #68) */}
      <form
        method="GET"
        className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-3 items-center"
      >
        <input
          type="text"
          name="q"
          defaultValue={q}
          aria-label="Buscar por nombre, email o teléfono"
          placeholder="Buscar por nombre, email o teléfono…"
          className="flex-1 min-w-[220px] min-h-11 border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        />

        <select
          name="source"
          defaultValue={source}
          aria-label="Filtrar por origen"
          className="min-h-11 border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        >
          <option value="ALL">Todos los orígenes</option>
          <option value="WHATSAPP">WhatsApp (Asistente)</option>
          <option value="CLUB">One Star Club</option>
          <option value="ABANDONED_CART">Carritos / Checkout</option>
          <option value="REGISTERED_NO_ORDER">Registrados sin compra</option>
        </select>

        <select
          name="stage"
          defaultValue={stage}
          aria-label="Filtrar por etapa"
          className="min-h-11 border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        >
          <option value="ALL">Todas las etapas</option>
          <option value="NUEVO">Nuevo (WA)</option>
          <option value="INTERESADO">Interesado (WA)</option>
          <option value="CARRITO">Carrito (WA)</option>
          <option value="CHECKOUT">Checkout (WA)</option>
          <option value="COMPRO">Compró (WA)</option>
          <option value="ABANDONO">Abandono (WA)</option>
          <option value="CLUB_REGISTRADO">Socio Club</option>
          <option value="CARRITO_ACTIVO">Carrito Activo (Web)</option>
          <option value="CARRITO_ABANDONADO">Carrito Abandonado (Web)</option>
          <option value="CHECKOUT_INICIADO">Checkout Iniciado (Web)</option>
          <option value="PROSPECTO">Prospecto (Web)</option>
        </select>

        <input
          type="text"
          name="utm"
          defaultValue={utm}
          aria-label="Filtrar por campaña o parámetro UTM"
          placeholder="UTM (campaña, código…)"
          className="min-w-[180px] min-h-11 border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        />

        <label className="flex min-h-11 items-center gap-2 text-sm text-[#4A4A4A] cursor-pointer select-none px-2">
          <input
            type="checkbox"
            name="hasPhone"
            value="true"
            defaultChecked={hasPhone}
            className="h-4 w-4 rounded text-[#E31C23] focus:ring-[#E31C23]"
          />
          Solo con WhatsApp / Teléfono
        </label>

        <button
          type="submit"
          className="min-h-11 bg-[#1C1C1C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#4A4A4A] transition-colors"
        >
          Filtrar
        </button>

        {hasActiveFilters && (
          <Link
            href="/admin/leads"
            className="inline-flex min-h-11 items-center text-sm text-[#4A4A4A] px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Tabla de Leads */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        {initialLeads.length === 0 ? (
          <div className="p-12 text-center text-[#4A4A4A]">
            <p className="text-lg font-medium">No se encontraron prospectos con los filtros actuales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75">
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Prospecto / Contacto</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Origen & UTM</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Etapa del Embudo</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Preferencia</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Intención / Valor</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Fecha</th>
                  <th className="text-right px-4 py-3 text-[#4A4A4A] font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialLeads.map((lead) => {
                  const isExpanded = expandedLeadId === lead.id
                  const events = lead.events ?? []
                  const hasUtm = Boolean(lead.utmSource || lead.utmMedium || lead.utmCampaign || lead.utmContent)

                  return (
                    <Fragment key={lead.id}>
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#1C1C1C]">{lead.name}</span>
                            {lead.optedOut && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-red-100 text-red-700 border border-red-200">
                                Baja
                              </span>
                            )}
                          </div>
                          {lead.email && <div className="text-xs text-gray-500">{lead.email}</div>}
                          {(lead.waPhone || lead.phone) && (
                            <div className="text-xs text-emerald-700 font-mono mt-0.5">
                              📞 {lead.waPhone ?? lead.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#4A4A4A]">
                          <div className="font-medium text-[#1C1C1C]">{lead.source}</div>
                          {hasUtm && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {lead.utmCampaign && (
                                <span className="px-1.5 py-0.5 text-[11px] bg-teal-50 text-teal-800 border border-teal-200 rounded font-mono">
                                  utm_campaign={lead.utmCampaign}
                                </span>
                              )}
                              {lead.utmContent && (
                                <span className="px-1.5 py-0.5 text-[11px] bg-gray-100 text-gray-700 rounded font-mono">
                                  code:{lead.utmContent}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">{getStageBadge(lead.stage)}</td>
                        <td className="px-4 py-3 text-xs text-[#4A4A4A]">
                          {lead.preferredBrand ? (
                            <span className="px-2 py-0.5 bg-gray-100 rounded font-medium text-[#1C1C1C]">
                              {lead.preferredBrand}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {lead.estimatedValue > 0 ? (
                            <div>
                              <div className="font-semibold text-emerald-800 text-xs">
                                {formatCurrency(lead.estimatedValue)}
                              </div>
                              <div className="text-[11px] text-gray-400">
                                {lead.cartItemCount} {lead.cartItemCount === 1 ? "registro" : "registros"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Sin carrito</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(lead.createdAt).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {(events.length > 0 || lead.source === "WhatsApp") && (
                              <button
                                type="button"
                                onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                                aria-expanded={isExpanded}
                                className="inline-flex min-h-11 items-center gap-1 text-xs border border-gray-200 bg-white hover:bg-gray-50 text-[#1C1C1C] font-semibold px-3 py-1.5 rounded-md transition-colors"
                              >
                                {isExpanded ? "Ocultar eventos" : `Eventos (${events.length})`}
                              </button>
                            )}
                            {lead.phone && !lead.optedOut ? (
                              <a
                                href={`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                  `Hola ${lead.name.split(" ")[0]}, te contactamos de One Star Oficial. Notamos tu interés en calzado deportivo, ¿en qué podemos asesorarte hoy?`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-md transition-colors"
                              >
                                <span>WhatsApp</span>
                              </a>
                            ) : lead.email ? (
                              <a
                                href={`mailto:${lead.email}?subject=${encodeURIComponent("Novedades exclusivas en One Star")}`}
                                className="inline-flex min-h-11 items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-[#1C1C1C] font-semibold px-3 py-1.5 rounded-md transition-colors"
                              >
                                Email
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-gray-50/90">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1C1C]">
                                  Línea de tiempo de eventos — {lead.name} ({lead.waPhone ?? lead.phone})
                                </h3>
                                <div className="flex flex-wrap gap-2 text-xs text-[#4A4A4A]">
                                  {lead.utmSource && <span>Fuente: <strong>{lead.utmSource}</strong></span>}
                                  {lead.utmMedium && <span>Medio: <strong>{lead.utmMedium}</strong></span>}
                                  {lead.utmCampaign && <span>Campaña: <strong>{lead.utmCampaign}</strong></span>}
                                  {lead.ctwaClid && <span>CTWA ID: <strong>{lead.ctwaClid}</strong></span>}
                                </div>
                              </div>

                              {events.length === 0 ? (
                                <p className="text-xs text-gray-500">Sin eventos registrados todavía.</p>
                              ) : (
                                <ol className="relative border-l border-gray-200 ml-2 space-y-3">
                                  {events.map((ev) => (
                                    <li key={ev.id} className="ml-4 text-xs">
                                      <span
                                        aria-hidden="true"
                                        className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-white bg-[#E31C23]"
                                      />
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-[#1C1C1C]">{ev.type}</span>
                                        {ev.stage && getStageBadge(ev.stage)}
                                        <span className="text-gray-400">
                                          {new Date(ev.createdAt).toLocaleString("es-CO")}
                                        </span>
                                      </div>
                                      {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                                        <pre className="mt-1 rounded bg-gray-50 px-2 py-1 text-[11px] text-gray-600 overflow-x-auto">
                                          {JSON.stringify(ev.metadata)}
                                        </pre>
                                      )}
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#4A4A4A] pt-2">
          <p>
            Página {page} de {totalPages} ({total} prospectos en total)
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={buildPageHref(page - 1)}
                className="inline-flex min-h-11 items-center px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                ← Anterior
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center px-3 py-1.5 border border-gray-100 rounded-lg text-gray-300">
                ← Anterior
              </span>
            )}
            {page < totalPages ? (
              <Link
                href={buildPageHref(page + 1)}
                className="inline-flex min-h-11 items-center px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Siguiente →
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center px-3 py-1.5 border border-gray-100 rounded-lg text-gray-300">
                Siguiente →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
