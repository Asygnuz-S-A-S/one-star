import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import AdminSidebar from "@/components/admin/AdminSidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user?.userType !== "admin") {
    redirect("/admin/login")
  }

  return (
    // Fixed overlay that covers the public layout (Header + body padding) entirely
    <div className="fixed inset-0 z-50 flex bg-[#F5F5F5]">
      <AdminSidebar
        userName={session.user?.name ?? "Admin"}
        userRole={session.user?.role ?? "SUPER_ADMIN"}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
