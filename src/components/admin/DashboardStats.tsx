import { formatCurrency } from "@/lib/dates"
import type { DashboardTrendsDTO, TrendDTO } from "@/server/services/dashboard.service"

interface DashboardStatsProps {
  gmv: number
  aov: number
  totalProducts: number
  totalCustomers: number
  newCustomers: number
  pendingOrders: number
  trends: DashboardTrendsDTO
}

const TREND_PERIOD_LABEL = "vs 30 días anteriores"
const NO_BASELINE_LABEL = "Sin período anterior para comparar"

interface KpiCardProps {
  label: string
  value: string
  icon: React.ReactNode
  /** `undefined` oculta la línea de tendencia; `null` indica que no hay base de comparación. */
  trend?: TrendDTO | null
  /** Texto que acompaña al porcentaje (qué se está comparando). */
  trendSubject?: string
  /** Nota fija (p. ej. "Requieren atención") en lugar de una tendencia. */
  note?: string
  accent?: boolean
}

function formatPercent(percent: number): string {
  return `${percent > 0 ? "+" : ""}${percent}%`
}

const TREND_STYLES: Record<TrendDTO["direction"], { color: string; path: string }> = {
  up: { color: "text-green-600", path: "M5 15l7-7 7 7" },
  down: { color: "text-red-500", path: "M19 9l-7 7-7-7" },
  flat: { color: "text-[#4A4A4A]", path: "M5 12h14" },
}

function TrendLine({ trend, subject }: { trend: TrendDTO | null; subject?: string }) {
  if (trend === null) {
    return (
      <span className="font-montserrat text-xs text-[#9A9A9A]">{NO_BASELINE_LABEL}</span>
    )
  }
  const style = TREND_STYLES[trend.direction]
  return (
    <div className={`flex items-center gap-1 ${style.color}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d={style.path} />
      </svg>
      <span className="font-montserrat text-xs">
        {formatPercent(trend.percent)} {subject ? `${subject} ` : ""}
        {TREND_PERIOD_LABEL}
      </span>
    </div>
  )
}

function KpiCard({ label, value, icon, trend, trendSubject, note, accent }: KpiCardProps) {
  return (
    <div
      className={`bg-white rounded-lg border p-4 flex flex-col gap-2 ${
        accent ? "border-[#E31C23]" : "border-[#E0E0E0]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-montserrat text-xs text-[#4A4A4A] uppercase tracking-wide">
          {label}
        </span>
        <span className={accent ? "text-[#E31C23]" : "text-[#1C1C1C]"}>
          {icon}
        </span>
      </div>
      <p className="font-barlow font-bold text-2xl text-[#1C1C1C]">{value}</p>
      {trend !== undefined && <TrendLine trend={trend} subject={trendSubject} />}
      {note && (
        <span className={`font-montserrat text-xs ${accent ? "text-[#E31C23]" : "text-[#4A4A4A]"}`}>
          {note}
        </span>
      )}
    </div>
  )
}

export default function DashboardStats({
  gmv,
  aov,
  totalProducts,
  totalCustomers,
  newCustomers,
  pendingOrders,
  trends,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <KpiCard
        label="GMV Total"
        value={formatCurrency(gmv)}
        trend={trends.gmv}
        trendSubject="últimos 30 días"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />
      <KpiCard
        label="Ticket Promedio"
        value={formatCurrency(aov)}
        trend={trends.aov}
        trendSubject="últimos 30 días"
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        }
      />
      <KpiCard
        label="Productos"
        value={String(totalProducts)}
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        }
      />
      <KpiCard
        label="Clientes"
        value={String(totalCustomers)}
        trend={trends.newCustomers}
        trendSubject={`en altas (${newCustomers} nuevos)`}
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        }
      />
      <KpiCard
        label="Pedidos Pendientes"
        value={String(pendingOrders)}
        accent={pendingOrders > 0}
        note={pendingOrders > 0 ? "Requieren atención" : undefined}
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />
    </div>
  )
}
