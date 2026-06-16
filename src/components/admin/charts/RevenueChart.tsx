"use client"

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartOptions,
} from "chart.js"
import { Line } from "react-chartjs-2"
import type { RevenueByDayDTO } from "@/server/services/dashboard.service"
import { formatCurrency } from "@/lib/dates"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

interface RevenueChartProps {
  data: RevenueByDayDTO[]
}

const options: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => formatCurrency(ctx.parsed.y ?? 0),
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
        maxTicksLimit: 10,
      },
      border: { display: false },
    },
    y: {
      grid: { color: "rgba(0,0,0,0.05)" },
      ticks: {
        font: { family: "var(--font-montserrat, sans-serif)", size: 11 },
        color: "#6B6B6B",
        callback: (v) => formatCurrency(Number(v)),
      },
      border: { display: false },
    },
  },
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const labels = data.map((d) => {
    const [, month, day] = d.date.split("-")
    return `${day}/${month}`
  })

  const chartData = {
    labels,
    datasets: [
      {
        data: data.map((d) => d.revenue),
        borderColor: "#E31C23",
        backgroundColor: "rgba(227,28,35,0.08)",
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: "#E31C23",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 1.5,
        fill: true,
        tension: 0.4,
      },
    ],
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#9E9E9E] font-montserrat text-sm">
        Sin datos en los últimos 30 días
      </div>
    )
  }

  return <Line data={chartData} options={options} />
}
