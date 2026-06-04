import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardStats from "@/components/admin/DashboardStats"
import TopProducts from "@/components/admin/TopProducts"
import LowStockAlerts from "@/components/admin/LowStockAlerts"
import { getAdminDashboardStats } from "@/server/services/dashboard.service"

export default async function AdminDashboardPage() {
  const session = await auth()
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProducts products={stats.topProducts} />
        <LowStockAlerts variants={stats.lowStockVariants} />
      </div>
    </div>
  )
}
