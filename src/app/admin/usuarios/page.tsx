import { requireSuperAdmin } from "@/server/auth/require-admin"
import { listAdminUsers } from "@/server/repositories/admin.repository"
import UsuariosManager from "./UsuariosManager"

export const dynamic = "force-dynamic"

export default async function AdminUsuariosPage() {
  await requireSuperAdmin()
  const admins = await listAdminUsers()

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <h1 className="mb-2 font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">Usuarios del admin</h1>
      <p className="mb-6 text-sm text-[#4A4A4A]">
        Solo un superadministrador puede crear cuentas y cambiar roles. El operador de inventario no entra a esta pantalla.
      </p>
      <UsuariosManager admins={admins} />
    </div>
  )
}
