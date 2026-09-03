"use client"

import { useSyncExternalStore } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartOptions,
} from "chart.js"
import { Bar } from "react-chartjs-2"
import type { OrdersByStatusDTO } from "@/server/services/dashboard.service"

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

interface OrdersChartProps {
  data: OrdersByStatusDTO[]
}

const STATUS_COLORS: Record<string, string> = {
  Pendiente: "#E31C23",
  Pagado: "#F59E0B",
  Enviado: "#3B82F6",
  Entregado: "#10B981",
  Cancelado: "#9E9E9E",
}

const subscribeToClient = () => () => {}

const options: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.parsed.y} pedidos`,
      },
      backgroundColor: "#1C1C1C",
      titleColor: "#ffffff",
      bodyColor: "#E0E0E0",
      borderColor: "#E31C23",
      borderWidth: 1,
      padding: 10,
    },
    legend: { display: false },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { family: "var(--font-montserrat, sans-serif)", size: 11 },
        color: "#6B6B6B",
      },
      border: { display: false },
    },
    y: {
      grid: { color: "rgba(0,0,0,0.05)" },
      ticks: {
        font: { family: "var(--font-montserrat, sans-serif)", size: 11 },
        color: "#6B6B6B",
        stepSize: 1,
      },
      border: { display: false },
      beginAtZero: true,
    },
  },
}

export default function OrdersChart({ data }: OrdersChartProps) {
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false)

  if (!mounted) {
    return <div className="h-full w-full bg-gray-50/50 animate-pulse rounded" />
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#9E9E9E] font-montserrat text-sm">
        Sin pedidos registrados
      </div>
    )
  }

  const chartData = {
    labels: data.map((d) => d.status),
    datasets: [
      {
        data: data.map((d) => d.count),
        backgroundColor: data.map((d) => STATUS_COLORS[d.status] ?? "#E31C23"),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }

  return <Bar data={chartData} options={options} />
}
