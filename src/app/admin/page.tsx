import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import DashboardStats from "@/components/admin/DashboardStats"
import TopProducts from "@/components/admin/TopProducts"
import LowStockAlerts from "@/components/admin/LowStockAlerts"
import { getAdminDashboardStats } from "@/server/services/dashboard.service"
import RevenueChart from "@/components/admin/charts/RevenueChart"
import OrdersChart from "@/components/admin/charts/OrdersChart"
import TopProductsChart from "@/components/admin/charts/TopProductsChart"

export default async function AdminDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/admin/login")

  const stats = await getAdminDashboardStats()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-barlow font-bold text-2xl text-[#1C1C1C]">
          Dashboard
        </h1>
        <p className="font-montserrat text-sm text-[#4A4A4A]">
          Bienvenido, {session.user?.name}
        </p>
      </div>

      <DashboardStats
        gmv={stats.gmv}
        aov={stats.aov}
        totalProducts={stats.totalProducts}
        totalCustomers={stats.totalCustomers}
        pendingOrders={stats.pendingOrders}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-lg border border-[#E0E0E0] p-5">
          <h2 className="font-barlow font-semibold text-base text-[#1C1C1C] mb-4">
            GMV — últimos 30 días
          </h2>
          <div className="h-56">
            <RevenueChart data={stats.revenueByDay} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E0E0E0] p-5">
          <h2 className="font-barlow font-semibold text-base text-[#1C1C1C] mb-4">
            Pedidos por estado
          </h2>
          <div className="h-56">
            <OrdersChart data={stats.ordersByStatus} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-[#E0E0E0] p-5 flex flex-col">
          <h2 className="font-barlow font-semibold text-base text-[#1C1C1C] mb-4">
            Top 5 productos por ingresos
          </h2>
          <div className="flex-1 min-h-[220px]">
            <TopProductsChart products={stats.topProducts} />
          </div>
        </div>

        <TopProducts products={stats.topProducts} />
        <LowStockAlerts variants={stats.lowStockVariants} />
      </div>
    </div>
  )
}
