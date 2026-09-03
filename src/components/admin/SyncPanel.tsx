"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  diagnoseErpEndpointsAction,
  saveErpSyncConfigAction,
  syncCatalogAction,
} from "@/server/actions/erp.actions"
import {
  ERP_SYNC_INTERVALS,
  scheduleDraftFromSnapshot,
} from "@/lib/erp-sync-schedule"
import type {
  ErpSyncInterval,
  ErpSyncScheduleSnapshot,
} from "@/lib/erp-sync-schedule"
import type {
  ErpSyncLogDTO,
  ErpSyncStatus,
} from "@/server/services/erp-sync.service"
import type {
  ERPEndpointDiagnostic,
  ERPEndpointDiagnostics,
} from "@/server/erp"
import {
  formatErpSyncCount,
  getErpErrorPresentation,
} from "@/lib/erp-sync-display"

interface SyncPanelProps {
  initialStatus: ErpSyncStatus
}

interface SyncResult {
  success?: boolean
  processedCount?: number
  productCount?: number
  variantCount?: number
  error?: string
}

type EndpointDiagnosticsState = ERPEndpointDiagnostics & { accessDenied?: boolean }

const INTERVAL_LABELS: Record<(typeof ERP_SYNC_INTERVALS)[number], string> = {
  15: "Cada 15 minutos",
  30: "Cada 30 minutos",
  60: "Cada hora",
  120: "Cada 2 horas",
  360: "Cada 6 horas",
  720: "Cada 12 horas",
  1440: "Cada 24 horas",
}

const BOGOTA_TZ = "America/Bogota"

function formatAbsolute(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BOGOTA_TZ,
  }).format(new Date(iso))
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—"
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function providerLabel(provider: string): string {
  const map: Record<string, string> = { loggro: "Loggro", alegra: "Alegra", null: "Ninguno" }
  return map[provider] ?? provider
}

function ErrorExplanation({ error, compact = false }: { error: string | null; compact?: boolean }) {
  const presentation = getErpErrorPresentation(error)

  return (
    <div className={compact ? "mt-3 max-w-xl" : ""}>
      <p className="font-semibold">{presentation.title}</p>
      <p className="mt-1">{presentation.explanation}</p>
      <p className="mt-2">
        <span className="font-semibold">Qué hacer:</span> {presentation.action}
      </p>
      {error && presentation.explanation !== error && (
        <details className="mt-2">
          <summary className="cursor-pointer font-medium underline underline-offset-2">
            Ver detalle técnico
          </summary>
          <p className="mt-1 break-words">{error}</p>
        </details>
      )}
    </div>
  )
}

const DIAGNOSTIC_LABELS: Record<ERPEndpointDiagnostic["endpoint"], string> = {
  connection: "Conexión API",
  catalog: "Catálogo",
  stock: "Disponibilidad / stock",
}

const DIAGNOSTIC_STYLES: Record<ERPEndpointDiagnostic["status"], string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-800",
  unsupported: "border-gray-200 bg-gray-50 text-gray-700",
}

const DIAGNOSTIC_STATUS_LABELS: Record<ERPEndpointDiagnostic["status"], string> = {
  healthy: "Correcto",
  warning: "Advertencia",
  error: "Error",
  unsupported: "No disponible",
}

function EndpointDiagnosticCard({ probe }: { probe: ERPEndpointDiagnostic }) {
  return (
    <article className={`rounded-lg border p-4 ${DIAGNOSTIC_STYLES[probe.status]}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold">{DIAGNOSTIC_LABELS[probe.endpoint]}</h3>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold">
          {DIAGNOSTIC_STATUS_LABELS[probe.status]}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="font-medium opacity-70">Respuesta</dt>
          <dd>{probe.httpStatus == null ? "No alcanzado" : `HTTP ${probe.httpStatus}`}</dd>
        </div>
        <div>
          <dt className="font-medium opacity-70">Latencia</dt>
          <dd>{formatDuration(probe.latencyMs)}</dd>
        </div>
      </dl>
      <p className="mt-3 break-words text-sm">{probe.detail}</p>
    </article>
  )
}

export default function SyncPanel({ initialStatus }: SyncPanelProps) {
  const router = useRouter()
  const [syncLoading, setSyncLoading] = useState(false)
  const [diagnosticLoading, setDiagnosticLoading] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [diagnostics, setDiagnostics] = useState<EndpointDiagnosticsState | null>(null)
  const [confirmedSchedule, setConfirmedSchedule] = useState<ErpSyncScheduleSnapshot>(() => ({
    enabled: initialStatus.catalogSyncAvailable && initialStatus.autoSyncEnabled,
    intervalMinutes: initialStatus.autoSyncMinutes,
    nextRunAt: initialStatus.nextAutoSyncAt,
  }))
  const [scheduleEnabled, setScheduleEnabled] = useState(
    initialStatus.catalogSyncAvailable && initialStatus.autoSyncEnabled
  )
  const [scheduleInterval, setScheduleInterval] = useState<ErpSyncInterval>(
    initialStatus.autoSyncMinutes
  )
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleMessage, setScheduleMessage] = useState<{
    success: boolean
    text: string
  } | null>(null)

  const status = initialStatus
  const { last } = status
  const scheduleDirty =
    scheduleEnabled !== confirmedSchedule.enabled ||
    scheduleInterval !== confirmedSchedule.intervalMinutes

  const restoreConfirmedSchedule = () => {
    const draft = scheduleDraftFromSnapshot(confirmedSchedule)
    setScheduleEnabled(draft.enabled)
    setScheduleInterval(draft.intervalMinutes)
  }

  const handleSync = async () => {
    setSyncLoading(true)
    setResult(null)
    try {
      const response = await syncCatalogAction()
      setResult(response)
      router.refresh()
    } catch {
      setResult({
        success: false,
        processedCount: 0,
        error: "No fue posible completar la solicitud. Revisa la conexión e inténtalo nuevamente.",
      })
    } finally {
      setSyncLoading(false)
    }
  }

  const handleDiagnostics = async () => {
    setDiagnosticLoading(true)
    setDiagnostics(null)
    try {
      setDiagnostics(await diagnoseErpEndpointsAction())
    } catch {
      const detail = "No fue posible completar la prueba. Revisa la conexión e inténtalo nuevamente."
      setDiagnostics({
        checkedAt: new Date().toISOString(),
        results: (["connection", "catalog", "stock"] as const).map((endpoint) => ({
          endpoint,
          status: "error",
          httpStatus: null,
          latencyMs: 0,
          detail,
        })),
      })
    } finally {
      setDiagnosticLoading(false)
    }
  }

  const handleSaveSchedule = async () => {
    setScheduleSaving(true)
    setScheduleMessage(null)
    try {
      const response = await saveErpSyncConfigAction({
        enabled: scheduleEnabled,
        intervalMinutes: scheduleInterval,
      })

      if (!response.success) {
        restoreConfirmedSchedule()
        setScheduleMessage({ success: false, text: response.error })
        router.refresh()
        return
      }

      setConfirmedSchedule(response.schedule)
      const savedDraft = scheduleDraftFromSnapshot(response.schedule)
      setScheduleEnabled(savedDraft.enabled)
      setScheduleInterval(savedDraft.intervalMinutes)
      setScheduleMessage({
        success: true,
        text: response.schedule.enabled
          ? "Programación automática guardada."
          : "Sincronizaciones automáticas desactivadas.",
      })
      router.refresh()
    } catch {
      restoreConfirmedSchedule()
      setScheduleMessage({
        success: false,
        text: "No fue posible guardar la programación. El valor anterior se conserva.",
      })
    } finally {
      setScheduleSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#1C1C1C]">Integraciones</h1>
        <p className="mt-1 text-gray-500">
          Sincronización del catálogo con el ERP{" "}
          <span className="font-medium text-gray-700">{providerLabel(status.provider)}</span>.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">API ERP</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                status.connected ? "bg-emerald-500" : "bg-red-500"
              }`}
              aria-hidden
            />
            <span className="text-lg font-semibold text-[#1C1C1C]">
              {status.connected ? "Responde" : "Sin respuesta"}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Healthcheck de {providerLabel(status.provider)}; no valida catálogo ni stock.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Sincronización automática
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                confirmedSchedule.enabled ? "bg-emerald-500" : "bg-gray-400"
              }`}
              aria-hidden
            />
            <span className="text-lg font-semibold text-[#1C1C1C]">
              {confirmedSchedule.enabled ? "Activa" : "Inactiva"}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {!status.catalogSyncAvailable
              ? "El ERP no admite catálogo"
              : confirmedSchedule.enabled
              ? INTERVAL_LABELS[confirmedSchedule.intervalMinutes]
              : "Inactiva"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Última sincronización
          </p>
          {last ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    last.success ? "bg-emerald-500" : "bg-red-500"
                  }`}
                  aria-hidden
                />
                <span className="text-lg font-semibold text-[#1C1C1C]">
                  {formatAbsolute(last.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {last.success ? formatErpSyncCount(last) : "Sincronización con error"}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-lg font-semibold text-gray-400">Nunca</p>
              <p className="mt-1 text-sm text-gray-500">Aún no se ha sincronizado</p>
            </>
          )}
        </div>
      </div>

      {last && !last.success && (
        <section
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900"
          aria-labelledby="last-erp-error"
        >
          <h2 id="last-erp-error" className="text-lg font-semibold">
            Último error de sincronización
          </h2>
          <ErrorExplanation error={last.error} compact />
        </section>
      )}

      {!status.catalogSyncAvailable && (
        <section
          className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"
          aria-labelledby="catalog-sync-unavailable"
        >
          <h2 id="catalog-sync-unavailable" className="text-lg font-semibold">
            Catálogo ERP no disponible
          </h2>
          <p className="mt-2 max-w-3xl">
            El ERP configurado no ofrece descarga de catálogo. Las sincronizaciones automáticas
            están desactivadas y no pueden habilitarse hasta conectar un ERP compatible. Las
            pruebas de endpoints continúan disponibles para diagnosticar la integración.
          </p>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold text-[#1C1C1C]">Programación automática</h2>
            <p className="mt-1 text-sm text-gray-500">
              {status.catalogSyncAvailable
                ? "Pausa las ejecuciones automáticas o decide cada cuánto deben comprobarse. La sincronización manual seguirá disponible."
                : "La programación permanecerá inactiva mientras el ERP no permita descargar el catálogo."}
            </p>

            <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                role="switch"
                checked={scheduleEnabled}
                onChange={(event) => setScheduleEnabled(event.target.checked)}
                disabled={scheduleSaving || !status.catalogSyncAvailable}
                aria-describedby={
                  status.catalogSyncAvailable ? undefined : "catalog-sync-unavailable"
                }
                className="h-5 w-5 accent-[#1C1C1C]"
              />
              Activar sincronizaciones automáticas
            </label>

            <label className="mt-4 block text-sm font-medium text-gray-800">
              Frecuencia
              <select
                value={scheduleInterval}
                onChange={(event) =>
                  setScheduleInterval(Number(event.target.value) as ErpSyncInterval)
                }
                disabled={scheduleSaving || !status.catalogSyncAvailable}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1C1C1C]/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-64"
              >
                {ERP_SYNC_INTERVALS.map((interval) => (
                  <option key={interval} value={interval}>
                    {INTERVAL_LABELS[interval]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={handleSaveSchedule}
            disabled={
              scheduleSaving ||
              syncLoading ||
              diagnosticLoading ||
              !status.catalogSyncAvailable
            }
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#1C1C1C] px-6 py-2.5 font-medium text-white transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-[#1C1C1C] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scheduleSaving ? "Guardando…" : "Guardar programación"}
          </button>
        </div>

        <div className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-600">
          {scheduleDirty && (
            <p className="mb-2 font-medium text-amber-800">Hay cambios sin guardar.</p>
          )}
          <p data-testid="erp-next-run">
            <span className="font-medium text-gray-800">Próxima ejecución:</span>{" "}
            {confirmedSchedule.enabled && confirmedSchedule.nextRunAt
              ? formatAbsolute(confirmedSchedule.nextRunAt)
              : "No programada"}
          </p>
          <p className="mt-2 text-xs text-amber-800">
            En despliegues serverless, la frecuencia efectiva depende de cada cuánto el scheduler
            externo invoque el endpoint de cron.
          </p>
        </div>

        <div aria-live="polite">
          {scheduleMessage && (
            <p
              className={`mt-4 rounded-lg border p-3 text-sm ${
                scheduleMessage.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
              role={scheduleMessage.success ? "status" : "alert"}
            >
              {scheduleMessage.text}
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1C1C1C]">Probar endpoints</h2>
            <p className="mt-1 max-w-xl text-sm text-gray-500">
              Comprueba conexión, catálogo y disponibilidad por separado. La prueba es de solo
              lectura y no modifica productos, inventario ni movimientos en el ERP.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDiagnostics}
            disabled={diagnosticLoading || syncLoading}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1C1C1C] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {diagnosticLoading ? "Probando…" : "Probar endpoints"}
          </button>
        </div>

        <div aria-live="polite" aria-busy={diagnosticLoading}>
          {diagnostics && (
            <div className="mt-5">
              <p className="mb-3 text-xs text-gray-500" suppressHydrationWarning>
                Comprobado el {formatAbsolute(diagnostics.checkedAt)}
              </p>
              {diagnostics.accessDenied ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Tu sesión de administrador expiró. Actualiza la página e inicia sesión nuevamente
                  para ejecutar la prueba.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {diagnostics.results.map((probe) => (
                    <EndpointDiagnosticCard key={probe.endpoint} probe={probe} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1C1C1C]">Sincronizar ahora</h2>
            <p className="mt-1 max-w-xl text-sm text-gray-500">
              {status.catalogSyncAvailable
                ? "Trae precios y stock desde el ERP. Los productos nuevos entran sin foto ni categoría; las imágenes y descripciones que edites aquí se conservan."
                : "Conecta un ERP con descarga de catálogo para traer precios, productos y stock."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncLoading || diagnosticLoading || !status.catalogSyncAvailable}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1C1C1C] px-6 py-2.5 font-medium text-white transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-[#1C1C1C] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {syncLoading
              ? "Sincronizando…"
              : status.catalogSyncAvailable
                ? "Sincronizar catálogo"
                : "Sincronización no disponible"}
          </button>
        </div>

        {result && (
          <div
            className={`mt-5 rounded-lg border p-4 text-sm ${
              result.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
            role={result.success ? "status" : "alert"}
          >
            {result.success ? (
              <p>
                <span className="font-semibold">¡Sincronización completada!</span> Se procesaron{" "}
                {formatErpSyncCount({
                  processedCount: result.processedCount ?? 0,
                  productCount: result.productCount,
                  variantCount: result.variantCount,
                })}.{" "}
                <Link href="/admin/productos" className="font-medium underline underline-offset-2">
                  Ver productos
                </Link>
              </p>
            ) : (
              <ErrorExplanation error={result.error ?? null} />
            )}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1C1C]">Historial reciente</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {status.history.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Aún no hay sincronizaciones registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Origen</th>
                    <th className="px-4 py-3 font-medium">Registros ERP</th>
                    <th className="px-4 py-3 font-medium">Resultado</th>
                    <th className="px-4 py-3 font-medium">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {status.history.map((log: ErpSyncLogDTO) => (
                    <tr key={log.id} className="align-top transition-colors hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700" suppressHydrationWarning>
                        {formatAbsolute(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.trigger === "MANUAL"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {log.trigger === "MANUAL" ? "Manual" : "Automático"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{log.processedCount}</td>
                      <td className="min-w-56 px-4 py-3">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                            Éxito
                          </span>
                        ) : (
                          <details className="text-red-800">
                            <summary className="cursor-pointer font-medium underline underline-offset-2">
                              Ver detalle del error
                            </summary>
                            <ErrorExplanation error={log.error} compact />
                          </details>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                        {formatDuration(log.durationMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
