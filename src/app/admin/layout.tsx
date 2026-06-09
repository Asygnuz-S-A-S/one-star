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
  const reqHeaders = await headers()

  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null
  try {
    session = await auth.api.getSession({ headers: reqHeaders })
  } catch {
    // Auth failure — proxy.ts will redirect unauthenticated requests
  }

  const isAdmin = session && (session.user as { userType?: string }).userType === "admin"

  // Without a valid admin session just pass children through.
  // proxy.ts enforces the redirect to /admin/login for protected routes;
  // the login page itself must render without the admin chrome.
  if (!isAdmin) {
    return <>{children}</>
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-[#F5F5F5]">
      <AdminSidebar
        userName={session!.user.name ?? "Admin"}
        userRole="SUPER_ADMIN"
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <AdminHotkeys />
    </div>
  )
}
