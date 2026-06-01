import { auth } from "@/lib/auth"
import { prisma } from "@/server/db/prisma"
import { redirect } from "next/navigation"
import DashboardStats from "@/components/admin/DashboardStats"
import TopProducts from "@/components/admin/TopProducts"
import LowStockAlerts from "@/components/admin/LowStockAlerts"

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session) redirect("/admin/login")

  // Default values
  let gmv = 0
  let aov = 0
  let totalProducts = 0
  let totalCustomers = 0
  let pendingOrders = 0
  let topProducts: Array<{
    name: string
    brand: string
    sold: number
    revenue: number
  }> = []
  let lowStockVariants: Array<{
    sku: string
    productName: string
    size: string
    color: string
    stock: number
  }> = []

  try {
    const [
      gmvResult,
      totalProductsCount,
      totalCustomersCount,
      pendingOrdersCount,
      orderItemsRaw,
      lowStockRaw,
    ] = await Promise.all([
      // GMV: sum of non-cancelled orders
      prisma.order.aggregate({
        _sum: { total: true },
        _count: { id: true },
        where: { status: { not: "CANCELLED" } },
      }),
      // Total products
      prisma.product.count(),
      // Total customers (User model)
      prisma.user.count(),
      // Pending orders
      prisma.order.count({ where: { status: "PENDING" } }),
      // Top products via orderItems
      prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true, unitPrice: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      // Low stock variants (stock <= 3)
      prisma.variant.findMany({
        where: { stock: { lte: 3 } },
        include: { product: { select: { name: true } } },
        orderBy: { stock: "asc" },
        take: 20,
      }),
    ])

    const rawGmv = Number(gmvResult._sum.total ?? 0)
    const orderCount = gmvResult._count.id

    gmv = rawGmv
    aov = orderCount > 0 ? Math.round(rawGmv / orderCount) : 0
    totalProducts = totalProductsCount
    totalCustomers = totalCustomersCount
    pendingOrders = pendingOrdersCount

    // Resolve product names for top products
    // NOTE: brand field exists in schema but Prisma client may be stale (run prisma generate)
    if (orderItemsRaw.length > 0) {
      const productIds = orderItemsRaw.map((oi) => oi.productId)
      type ProductRow = { id: string; name: string; brand: string | null }
      const products = (await prisma.$queryRaw`
        SELECT id, name, brand FROM "Product" WHERE id = ANY(${productIds})
      `) as ProductRow[]
      const productMap = new Map(products.map((p) => [p.id, p]))

      topProducts = orderItemsRaw.map((oi) => {
        const product = productMap.get(oi.productId)
        const sold = oi._sum.quantity ?? 0
        const unitPrice = Number(oi._sum.unitPrice ?? 0)
        return {
          name: product?.name ?? "Producto eliminado",
          brand: product?.brand ?? "-",
          sold,
          revenue: Math.round(unitPrice * sold),
        }
      })
    }

    lowStockVariants = lowStockRaw.map((v) => ({
      sku: v.sku,
      productName: v.product.name,
      size: v.size,
      color: v.color,
      stock: v.stock,
    }))
  } catch (error) {
    console.error("[AdminDashboard] DB error:", error)
    // All values remain at defaults (0 / empty arrays)
  }

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
        gmv={gmv}
        aov={aov}
        totalProducts={totalProducts}
        totalCustomers={totalCustomers}
        pendingOrders={pendingOrders}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProducts products={topProducts} />
        <LowStockAlerts variants={lowStockVariants} />
      </div>
    </div>
  )
}
