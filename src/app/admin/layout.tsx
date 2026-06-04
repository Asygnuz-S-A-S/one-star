import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import AdminSidebar from "@/components/admin/AdminSidebar"
import AdminHotkeys from "@/components/admin/AdminHotkeys"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session || (session.user as { userType?: string }).userType !== "admin") {
    redirect("/admin/login")
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-[#F5F5F5]">
      <AdminSidebar
        userName={session.user.name ?? "Admin"}
        userRole="SUPER_ADMIN"
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <AdminHotkeys />
    </div>
  )
}
