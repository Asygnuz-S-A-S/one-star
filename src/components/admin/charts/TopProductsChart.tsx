"use client"

import { useSyncExternalStore } from "react"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js"
import { Doughnut } from "react-chartjs-2"
import type { TopProductDTO } from "@/server/services/dashboard.service"
import { formatCurrency } from "@/lib/dates"

ChartJS.register(ArcElement, Tooltip, Legend)

interface TopProductsChartProps {
  products: TopProductDTO[]
}

const PALETTE = ["#E31C23", "#FF6B6B", "#FF9B9B", "#FFC0C0", "#FFD6D6"]

const subscribeToClient = () => () => {}

const options: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "68%",
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const idx = ctx.dataIndex
          return ` ${formatCurrency(ctx.dataset.data[idx] as number)}`
        },
      },
      backgroundColor: "#1C1C1C",
      titleColor: "#ffffff",
      bodyColor: "#E0E0E0",
      borderColor: "#E31C23",
      borderWidth: 1,
      padding: 10,
    },
    legend: {
      position: "bottom",
      labels: {
        font: { family: "var(--font-montserrat, sans-serif)", size: 11 },
        color: "#4A4A4A",
        padding: 14,
        usePointStyle: true,
        pointStyleWidth: 10,
      },
    },
  },
}

export default function TopProductsChart({ products }: TopProductsChartProps) {
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false)

  if (!mounted) {
    return <div className="h-full w-full bg-gray-50/50 animate-pulse rounded" />
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#9E9E9E] font-montserrat text-sm">
        Sin ventas registradas
      </div>
    )
  }

  const chartData = {
    labels: products.map((p) => p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name),
    datasets: [
      {
        data: products.map((p) => p.revenue),
        backgroundColor: PALETTE.slice(0, products.length),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  }

  return <Doughnut data={chartData} options={options} />
}
