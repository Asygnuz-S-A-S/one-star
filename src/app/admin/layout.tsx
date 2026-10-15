import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import AdminSidebar from "@/components/admin/AdminSidebar"
import AdminHotkeys from "@/components/admin/AdminHotkeys"
import { resolveActiveAdminRole } from "@/server/services/admin-role.service"

// El panel admin depende de la base de datos y de la sesión: nunca debe
// pre-generarse en build (cuando no hay DB). Forzamos render dinámico.
export const dynamic = "force-dynamic"

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

  if (!session || (session.user as { userType?: string }).userType !== "admin") {
    return <main className="flex-1">{children}</main>
  }

  const activeRole = await resolveActiveAdminRole(
    session.user.id,
    (session.user as { email?: string } | undefined)?.email
  )

  if (!activeRole) {
    return <main className="flex-1">{children}</main>
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-[#F5F5F5]">
      <AdminSidebar
        userName={session.user.name ?? "Admin"}
        userRole={activeRole}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <AdminHotkeys />
    </div>
  )
}
