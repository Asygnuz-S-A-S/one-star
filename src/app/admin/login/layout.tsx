// This layout intentionally overrides the parent AdminLayout so the login
// page is accessible without an authenticated session (no auth guard).
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
