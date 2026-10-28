"use client"

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
  hasPhone,
}: LeadsManagerProps) {

  function formatCurrency(val: number) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val)
  }

  function getStageBadge(stage: string) {
    switch (stage) {
      case "CHECKOUT_INICIADO":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 border border-amber-200">Checkout Iniciado</span>
      case "CARRITO_ABANDONADO":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-800 border border-rose-200">Carrito Abandonado</span>
      case "CARRITO_ACTIVO":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 border border-blue-200">Carrito Activo</span>
      case "CLUB_REGISTRADO":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800 border border-purple-200">Socio Club</span>
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-800 border border-gray-200">Prospecto</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Tarjetas de Métricas CRM */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs text-[#4A4A4A] uppercase font-bold tracking-wider">Total Leads</p>
          <p className="text-2xl font-bold text-[#1C1C1C] mt-1">{stats.totalLeads}</p>
          <p className="text-xs text-gray-400 mt-1">Sin compra finalizada</p>
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
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs col-span-2 md:col-span-1">
          <p className="text-xs text-blue-700 uppercase font-bold tracking-wider">Clientes Convertidos</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.convertedCustomersCount}</p>
          <p className="text-xs text-blue-500 mt-1">Con orden pagada</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <form method="GET" className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, email o teléfono…"
          className="flex-1 min-w-[240px] border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        />

        <select
          name="source"
          defaultValue={source}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        >
          <option value="ALL">Todos los orígenes</option>
          <option value="CLUB">One Star Club</option>
          <option value="ABANDONED_CART">Carritos / Checkout</option>
          <option value="REGISTERED_NO_ORDER">Registrados sin compra</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-[#4A4A4A] cursor-pointer select-none">
          <input
            type="checkbox"
            name="hasPhone"
            value="true"
            defaultChecked={hasPhone}
            className="rounded text-[#E31C23] focus:ring-[#E31C23]"
          />
          Solo con WhatsApp / Teléfono
        </label>

        <button
          type="submit"
          className="bg-[#1C1C1C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#4A4A4A] transition-colors"
        >
          Filtrar
        </button>

        {(q || source !== "ALL" || hasPhone) && (
          <Link
            href="/admin/leads"
            className="text-sm text-[#4A4A4A] px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
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
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Origen</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Etapa del Embudo</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Preferencia</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Intención / Valor</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Fecha</th>
                  <th className="text-right px-4 py-3 text-[#4A4A4A] font-semibold">Acción Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1C1C1C]">{lead.name}</div>
                      <div className="text-xs text-gray-500">{lead.email}</div>
                      {lead.phone && (
                        <div className="text-xs text-emerald-700 font-mono mt-0.5">📞 {lead.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#4A4A4A]">
                      <span className="font-medium">{lead.source}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getStageBadge(lead.stage)}
                    </td>
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
                            {lead.cartItemCount} {lead.cartItemCount === 1 ? "artículo" : "artículos"}
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
                      {lead.phone ? (
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                            `Hola ${lead.name.split(" ")[0]}, te contactamos de One Star Oficial. Notamos tu interés en calzado deportivo, ¿en qué podemos asesorarte hoy?`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1.5 rounded-md transition-colors"
                        >
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <a
                          href={`mailto:${lead.email}?subject=${encodeURIComponent("Novedades exclusivas en One Star")}`}
                          className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-[#1C1C1C] font-semibold px-2.5 py-1.5 rounded-md transition-colors"
                        >
                          Email
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
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
                href={`/admin/leads?page=${page - 1}&q=${q}&source=${source}&hasPhone=${hasPhone}`}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                ← Anterior
              </Link>
            ) : (
              <span className="px-3 py-1.5 border border-gray-100 rounded-lg text-gray-300">
                ← Anterior
              </span>
            )}
            {page < totalPages ? (
              <Link
                href={`/admin/leads?page=${page + 1}&q=${q}&source=${source}&hasPhone=${hasPhone}`}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Siguiente →
              </Link>
            ) : (
              <span className="px-3 py-1.5 border border-gray-100 rounded-lg text-gray-300">
                Siguiente →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
