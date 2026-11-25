"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import { PRESET_LEAD_TAGS, normalizeLeadTag, normalizeLeadTags } from "@/lib/lead-tags"
import type { LeadDTO, LeadStats } from "@/server/services/lead.service"
import {
  resolveLeadHandoffAction,
  toggleLeadBotAction,
  toggleWhatsappBotGlobalAction,
  updateLeadTagsAction,
} from "@/server/actions/lead-bot.actions"

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
  tag?: string
  availableTags?: string[]
  hasPhone: boolean
  needsHumanOnly?: boolean
  initialBotGlobalEnabled?: boolean
  canToggleGlobalBot?: boolean
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
  tag = "ALL",
  availableTags = [],
  hasPhone,
  needsHumanOnly = false,
  initialBotGlobalEnabled = true,
  canToggleGlobalBot = false,
}: LeadsManagerProps) {
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)
  const [botGlobalEnabled, setBotGlobalEnabled] = useState<boolean>(initialBotGlobalEnabled)
  const [globalLoading, setGlobalLoading] = useState(false)
  const [pausedById, setPausedById] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const lead of initialLeads) {
      map[lead.id] = Boolean(lead.botPaused)
    }
    return map
  })
  const [pausedUntilById, setPausedUntilById] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {}
    for (const lead of initialLeads) {
      map[lead.id] = lead.botPausedUntil ?? null
    }
    return map
  })
  const [needsHumanById, setNeedsHumanById] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const lead of initialLeads) {
      map[lead.id] = Boolean(lead.needsHuman)
    }
    return map
  })
  const [tagsById, setTagsById] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {}
    for (const lead of initialLeads) {
      map[lead.id] = lead.tags ?? []
    }
    return map
  })
  const [tagEditorLeadId, setTagEditorLeadId] = useState<string | null>(null)
  const [customTagDraft, setCustomTagDraft] = useState("")
  const [renderedAtMs] = useState(() => Date.now())
  const [loadingLeadIds, setLoadingLeadIds] = useState<Record<string, boolean>>({})
  const [botError, setBotError] = useState<string | null>(null)

  const filterTagOptions = normalizeLeadTags([...PRESET_LEAD_TAGS, ...availableTags])

  function isAutoPausedActive(untilIso: string | null | undefined): boolean {
    if (!untilIso) return false
    const ms = new Date(untilIso).getTime()
    return Number.isFinite(ms) && ms > renderedAtMs
  }

  async function handleGlobalBotToggle() {
    if (!canToggleGlobalBot || globalLoading) return
    const nextEnabled = !botGlobalEnabled
    setGlobalLoading(true)
    setBotError(null)
    try {
      const res = await toggleWhatsappBotGlobalAction(nextEnabled)
      if (!res.success) {
        setBotError(res.error ?? "No se pudo cambiar el estado global del bot.")
        return
      }
      setBotGlobalEnabled(res.botGlobalEnabled ?? nextEnabled)
    } finally {
      setGlobalLoading(false)
    }
  }

  async function handleLeadBotToggle(lead: LeadDTO) {
    if (lead.optedOut || loadingLeadIds[lead.id]) return
    const currentlyOff =
      Boolean(pausedById[lead.id]) || isAutoPausedActive(pausedUntilById[lead.id])
    const nextPaused = !currentlyOff
    setLoadingLeadIds((prev) => ({ ...prev, [lead.id]: true }))
    setBotError(null)
    try {
      const targetId = lead.leadRecordId ?? lead.id
      const res = await toggleLeadBotAction(targetId, nextPaused)
      if (!res.success) {
        setBotError(res.error ?? "No se pudo actualizar el bot para este chat.")
        return
      }
      setPausedById((prev) => ({ ...prev, [lead.id]: res.botPaused ?? nextPaused }))
      if (!nextPaused) {
        setPausedUntilById((prev) => ({ ...prev, [lead.id]: null }))
        setNeedsHumanById((prev) => ({ ...prev, [lead.id]: false }))
      }
    } finally {
      setLoadingLeadIds((prev) => ({ ...prev, [lead.id]: false }))
    }
  }

  async function handleResolveHandoff(lead: LeadDTO) {
    if (loadingLeadIds[lead.id]) return
    setLoadingLeadIds((prev) => ({ ...prev, [lead.id]: true }))
    setBotError(null)
    try {
      const targetId = lead.leadRecordId ?? lead.id
      const res = await resolveLeadHandoffAction(targetId)
      if (!res.success) {
        setBotError(res.error ?? "No se pudo marcar el caso como atendido.")
        return
      }
      setNeedsHumanById((prev) => ({ ...prev, [lead.id]: false }))
    } finally {
      setLoadingLeadIds((prev) => ({ ...prev, [lead.id]: false }))
    }
  }

  async function saveLeadTags(lead: LeadDTO, nextTags: string[]) {
    if (loadingLeadIds[lead.id]) return
    const normalized = normalizeLeadTags(nextTags)
    setLoadingLeadIds((prev) => ({ ...prev, [lead.id]: true }))
    setBotError(null)
    try {
      const targetId = lead.leadRecordId ?? lead.id
      const res = await updateLeadTagsAction(targetId, normalized)
      if (!res.success) {
        setBotError(res.error ?? "No se pudieron guardar las etiquetas.")
        return
      }
      setTagsById((prev) => ({ ...prev, [lead.id]: res.tags ?? normalized }))
    } finally {
      setLoadingLeadIds((prev) => ({ ...prev, [lead.id]: false }))
    }
  }

  function handleAddLeadTag(lead: LeadDTO, rawTag: string) {
    const clean = normalizeLeadTag(rawTag)
    if (!clean) return
    const current = tagsById[lead.id] ?? []
    void saveLeadTags(lead, [...current, clean])
    setCustomTagDraft("")
  }

  function handleRemoveLeadTag(lead: LeadDTO, tagToRemove: string) {
    const current = tagsById[lead.id] ?? []
    const next = current.filter((t) => t.toLowerCase() !== tagToRemove.toLowerCase())
    void saveLeadTags(lead, next)
  }

  function getTagPillClass(label: string): string {
    const low = label.toLowerCase()
    if (low === "compró" || low === "compro") {
      return "bg-emerald-50 text-emerald-800 border-emerald-200"
    }
    if (low.includes("reclamo") || low.includes("garant") || low === "baja") {
      return "bg-red-50 text-red-700 border-red-200"
    }
    if (low.includes("asesor") || low.includes("abandonado")) {
      return "bg-amber-50 text-amber-900 border-amber-200"
    }
    if (low.includes("pauta") || low === "vip") {
      return "bg-purple-50 text-purple-800 border-purple-200"
    }
    if (low.includes("potencial") || low.includes("addi")) {
      return "bg-indigo-50 text-indigo-800 border-indigo-200"
    }
    return "bg-gray-100 text-[#1C1C1C] border-gray-200"
  }

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
    if (tag && tag !== "ALL") params.set("tag", tag)
    if (hasPhone) params.set("hasPhone", "true")
    if (needsHumanOnly) params.set("needsHuman", "true")
    return `/admin/leads?${params.toString()}`
  }

  const hasActiveFilters = Boolean(
    q ||
      source !== "ALL" ||
      (stage && stage !== "ALL") ||
      utm ||
      (tag && tag !== "ALL") ||
      hasPhone ||
      needsHumanOnly
  )

  return (
    <div className="space-y-6">
      {/* Control Manual (Suiche) del Bot de WhatsApp */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                botGlobalEnabled ? "bg-emerald-500" : "bg-red-500"
              }`}
              aria-hidden="true"
            />
            <h2 className="text-sm font-bold text-[#1C1C1C]">
              Bot de WhatsApp: {botGlobalEnabled ? "Encendido" : "Apagado globalmente"}
            </h2>
            {(stats.botPausedCount ?? 0) > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {stats.botPausedCount} {stats.botPausedCount === 1 ? "chat pausado" : "chats pausados"}
              </span>
            )}
            {(stats.pendingHandoffCount ?? 0) > 0 && (
              <Link
                href="/admin/leads?needsHuman=true"
                className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#E31C23] text-white hover:bg-red-700 transition-colors"
              >
                {stats.pendingHandoffCount}{" "}
                {stats.pendingHandoffCount === 1 ? "esperando asesora" : "esperando asesora"}
              </Link>
            )}
          </div>
          <p className="text-xs text-[#4A4A4A]">
            Todo chat nuevo responde de inmediato. Si Jesi escribe desde el celular o el cliente pide asesora, ese chat se pausa automáticamente (con alerta en el Dashboard) y puedes reactivarlo o apagarlo aquí en cualquier momento.
          </p>
          {botError && (
            <p className="text-xs font-medium text-red-600" role="alert">
              {botError}
            </p>
          )}
        </div>

        {canToggleGlobalBot ? (
          <button
            type="button"
            role="switch"
            aria-checked={botGlobalEnabled}
            disabled={globalLoading}
            onClick={handleGlobalBotToggle}
            className={`inline-flex min-h-11 shrink-0 items-center gap-3 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors cursor-pointer disabled:opacity-60 ${
              botGlobalEnabled
                ? "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100"
                : "bg-red-50 border-red-200 text-red-900 hover:bg-red-100"
            }`}
          >
            <span
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                botGlobalEnabled ? "bg-emerald-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  botGlobalEnabled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </span>
            <span>
              {globalLoading
                ? "Guardando…"
                : botGlobalEnabled
                  ? "Apagar bot (todos)"
                  : "Prender bot (todos)"}
            </span>
          </button>
        ) : (
          <span className="text-xs text-gray-500 shrink-0">
            Solo Super Admin cambia el suiche global
          </span>
        )}
      </div>

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

        <select
          name="tag"
          defaultValue={tag}
          aria-label="Filtrar por etiqueta"
          className="min-h-11 border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        >
          <option value="ALL">Todas las etiquetas</option>
          {filterTagOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

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

        <label className="flex min-h-11 items-center gap-2 text-sm text-[#4A4A4A] cursor-pointer select-none px-2">
          <input
            type="checkbox"
            name="needsHuman"
            value="true"
            defaultChecked={needsHumanOnly}
            className="h-4 w-4 rounded text-[#E31C23] focus:ring-[#E31C23]"
          />
          Solo esperando asesora
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
                  <th className="text-center px-4 py-3 text-[#4A4A4A] font-semibold">Bot WA</th>
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
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-[#1C1C1C]">{lead.name}</span>
                            {lead.optedOut && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-red-100 text-red-700 border border-red-200">
                                Baja
                              </span>
                            )}
                            {needsHumanById[lead.id] && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-[#E31C23] text-white">
                                Pide asesora
                              </span>
                            )}
                          </div>
                          {lead.email && <div className="text-xs text-gray-500">{lead.email}</div>}
                          {(lead.waPhone || lead.phone) && (
                            <div className="text-xs text-emerald-700 font-mono mt-0.5">
                              📞 {lead.waPhone ?? lead.phone}
                            </div>
                          )}
                          {needsHumanById[lead.id] && lead.handoffReason && (
                            <div className="text-xs text-red-700 mt-1 line-clamp-2">
                              “{lead.handoffReason}”
                            </div>
                          )}
                          {lead.source === "WhatsApp" && (
                            <div className="mt-2 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1">
                                {(tagsById[lead.id] ?? []).map((t) => (
                                  <span
                                    key={t}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${getTagPillClass(t)}`}
                                  >
                                    <span>{t}</span>
                                    <button
                                      type="button"
                                      disabled={Boolean(loadingLeadIds[lead.id])}
                                      aria-label={`Quitar etiqueta ${t} de ${lead.name}`}
                                      onClick={() => handleRemoveLeadTag(lead, t)}
                                      className="hover:text-red-700 leading-none cursor-pointer disabled:opacity-50"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                                <button
                                  type="button"
                                  disabled={Boolean(loadingLeadIds[lead.id])}
                                  onClick={() => {
                                    setTagEditorLeadId(tagEditorLeadId === lead.id ? null : lead.id)
                                    setCustomTagDraft("")
                                  }}
                                  className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border border-dashed border-gray-300 text-[#4A4A4A] hover:border-[#1C1C1C] hover:text-[#1C1C1C] cursor-pointer"
                                >
                                  {tagEditorLeadId === lead.id ? "Cerrar" : "+ Etiqueta"}
                                </button>
                              </div>

                              {tagEditorLeadId === lead.id && (
                                <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 space-y-2 max-w-xs">
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      value={customTagDraft}
                                      onChange={(e) => setCustomTagDraft(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault()
                                          handleAddLeadTag(lead, customTagDraft)
                                        }
                                      }}
                                      maxLength={40}
                                      placeholder="Nueva etiqueta…"
                                      aria-label={`Agregar etiqueta a ${lead.name}`}
                                      className="flex-1 min-w-0 border border-gray-200 bg-white rounded px-2 py-1 text-xs text-[#1C1C1C] focus:outline-none focus:ring-1 focus:ring-[#E31C23]"
                                    />
                                    <button
                                      type="button"
                                      disabled={!customTagDraft.trim() || Boolean(loadingLeadIds[lead.id])}
                                      onClick={() => handleAddLeadTag(lead, customTagDraft)}
                                      className="px-2.5 py-1 rounded bg-[#1C1C1C] text-white text-xs font-semibold hover:bg-[#4A4A4A] disabled:opacity-50 cursor-pointer"
                                    >
                                      Agregar
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {PRESET_LEAD_TAGS.filter(
                                      (preset) =>
                                        !(tagsById[lead.id] ?? []).some(
                                          (existing) => existing.toLowerCase() === preset.toLowerCase()
                                        )
                                    ).map((preset) => (
                                      <button
                                        key={preset}
                                        type="button"
                                        disabled={Boolean(loadingLeadIds[lead.id])}
                                        onClick={() => handleAddLeadTag(lead, preset)}
                                        className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-white border border-gray-200 text-[#4A4A4A] hover:border-[#E31C23] hover:text-[#1C1C1C] cursor-pointer"
                                      >
                                        + {preset}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
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
                        <td className="px-4 py-3 text-center">
                          {lead.source === "WhatsApp" ? (
                            lead.optedOut ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-red-50 text-red-700 border border-red-200">
                                Baja
                              </span>
                            ) : (() => {
                              const manualOff = Boolean(pausedById[lead.id])
                              const autoOff = isAutoPausedActive(pausedUntilById[lead.id])
                              const isOff = manualOff || autoOff
                              const untilLabel =
                                autoOff && pausedUntilById[lead.id]
                                  ? new Date(pausedUntilById[lead.id]!).toLocaleTimeString("es-CO", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : null
                              return (
                                <div className="inline-flex flex-col items-center gap-1">
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={!isOff}
                                    aria-label={`Bot de WhatsApp para ${lead.name}`}
                                    disabled={Boolean(loadingLeadIds[lead.id])}
                                    onClick={() => handleLeadBotToggle(lead)}
                                    className={`inline-flex min-h-11 items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-60 ${
                                      manualOff
                                        ? "bg-red-50 border-red-200 text-red-800 hover:bg-red-100"
                                        : autoOff
                                          ? "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
                                          : "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                                    }`}
                                  >
                                    <span
                                      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                        isOff ? "bg-gray-300" : "bg-emerald-600"
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                          isOff ? "translate-x-0.5" : "translate-x-3.5"
                                        }`}
                                      />
                                    </span>
                                    <span>
                                      {loadingLeadIds[lead.id]
                                        ? "…"
                                        : manualOff
                                          ? "Apagado"
                                          : autoOff
                                            ? `Pausa ${untilLabel}`
                                            : "Encendido"}
                                    </span>
                                  </button>
                                  {needsHumanById[lead.id] && (
                                    <button
                                      type="button"
                                      disabled={Boolean(loadingLeadIds[lead.id])}
                                      onClick={() => handleResolveHandoff(lead)}
                                      className="text-[11px] font-semibold text-[#E31C23] hover:underline cursor-pointer disabled:opacity-60"
                                    >
                                      Marcar atendido
                                    </button>
                                  )}
                                </div>
                              )
                            })()
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
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
                          <td colSpan={8} className="px-4 py-4">
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
