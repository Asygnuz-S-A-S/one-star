import { requireSuperAdmin } from "@/server/auth/require-admin"
import { listAdminUsers } from "@/server/repositories/admin.repository"
import UsuariosManager from "./UsuariosManager"

export const dynamic = "force-dynamic"

export default async function AdminUsuariosPage() {
  await requireSuperAdmin()
  const admins = await listAdminUsers()
  const activeSuperAdminsCount = admins.filter(
    (a) => a.role === "SUPER_ADMIN" && a.isActive
  ).length

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <h1 className="mb-2 font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">Usuarios del admin</h1>
      <p className="mb-6 text-sm text-[#4A4A4A]">
        Solo un superadministrador puede crear cuentas y cambiar roles. El operador de inventario no entra a esta pantalla.
      </p>

      {activeSuperAdminsCount <= 1 && (
        <div
          className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
          data-testid="single-superadmin-warning"
        >
          <svg
            className="w-5 h-5 shrink-0 text-amber-600 mt-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold">
              Crea un segundo super administrador para poder recuperar el acceso
            </p>
            <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
              Actualmente solo existe un superadministrador activo. Contar con al menos dos cuentas permite restablecer el acceso en caso de emergencia.
            </p>
          </div>
        </div>
      )}

      <UsuariosManager admins={admins} />
    </div>
  )
}
