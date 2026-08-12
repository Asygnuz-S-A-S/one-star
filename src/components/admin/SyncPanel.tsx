"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { syncCatalogAction } from "@/server/actions/erp.actions"
import type { ErpSyncStatus, ErpSyncLogDTO } from "@/server/services/erp-sync.service"

interface SyncPanelProps {
  initialStatus: ErpSyncStatus
}

interface SyncResult {
  success?: boolean
  processedCount?: number
  error?: string
}

const BOGOTA_TZ = "America/Bogota"

function formatAbsolute(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BOGOTA_TZ,
  }).format(new Date(iso))
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "hace un momento"
  if (min < 60) return `hace ${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} día${days > 1 ? "s" : ""}`
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

export default function SyncPanel({ initialStatus }: SyncPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  // Evita el desajuste de hidratación: los tiempos relativos solo tras montar.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const status = initialStatus
  const { last } = status

  const handleSync = async () => {
    setLoading(true)
    setResult(null)
    const res = await syncCatalogAction()
    setResult(res)
    setLoading(false)
    router.refresh() // recarga el server component → estado e historial frescos
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

      {/* Tarjetas de estado */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Conexión */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Conexión</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                status.connected ? "bg-emerald-500" : "bg-red-500"
              }`}
              aria-hidden
            />
            <span className="text-lg font-semibold text-[#1C1C1C]">
              {status.connected ? "Conectado" : "Sin conexión"}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{providerLabel(status.provider)}</p>
        </div>

        {/* Auto-sync */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Sincronización automática
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
            <span className="text-lg font-semibold text-[#1C1C1C]">Activa</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">Cada {status.autoSyncMinutes} minutos</p>
        </div>

        {/* Última sincronización */}
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
                <span className="text-lg font-semibold text-[#1C1C1C]" suppressHydrationWarning>
                  {mounted ? timeAgo(last.createdAt) : formatAbsolute(last.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {last.success ? `${last.processedCount} productos` : "Falló"}
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

      {/* Acción de sincronizar */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1C1C1C]">Sincronizar ahora</h2>
            <p className="mt-1 max-w-xl text-sm text-gray-500">
              Trae precios y stock desde el ERP. Los productos nuevos entran sin foto ni categoría;
              las imágenes y descripciones que edites aquí se conservan.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1C1C1C] px-6 py-2.5 font-medium text-white transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1C1C1C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Sincronizando…" : "Sincronizar catálogo"}
          </button>
        </div>

        {result && (
          <div
            className={`mt-5 rounded-lg border p-4 text-sm ${
              result.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {result.success ? (
              <p>
                <span className="font-semibold">¡Sincronización completada!</span> Se procesaron{" "}
                {result.processedCount} productos.{" "}
                <Link href="/admin/productos" className="font-medium underline underline-offset-2">
                  Ver productos
                </Link>
              </p>
            ) : (
              <p>
                <span className="font-semibold">Ocurrió un error:</span> {result.error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Historial */}
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
                    <th className="px-4 py-3 font-medium">Productos</th>
                    <th className="px-4 py-3 font-medium">Resultado</th>
                    <th className="px-4 py-3 font-medium">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {status.history.map((log: ErpSyncLogDTO) => (
                    <tr key={log.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700" suppressHydrationWarning>
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
                      <td className="px-4 py-3">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                            Éxito
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 text-red-700"
                            title={log.error ?? undefined}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
                            Error
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDuration(log.durationMs)}</td>
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
