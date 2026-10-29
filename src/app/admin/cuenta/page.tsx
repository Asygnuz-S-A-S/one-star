import { getAdminSession } from "@/server/auth/require-admin"
import { findAdminById } from "@/server/repositories/admin.repository"
import ChangePasswordForm from "./ChangePasswordForm"

export const dynamic = "force-dynamic"

export default async function AdminCuentaPage() {
  // "Mi cuenta" es de CUALQUIER rol (cambiar la propia contraseña), no solo Super Admin.
  const session = await getAdminSession()
  if (!session) {
    return <div className="p-8 text-gray-600">No autorizado.</div>
  }
  const admin = await findAdminById(session.user.id)

  const roleLabel =
    admin?.role === "SUPER_ADMIN"
      ? "Super Administrador"
      : admin?.role === "INVENTORY_OPERATOR"
        ? "Operador de Inventario"
        : admin?.role ?? "Administrador"

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8 space-y-8">
      <div>
        <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">
          Mi cuenta
        </h1>
        <p className="mt-1 text-sm text-[#4A4A4A]">
          Gestiona los datos de acceso y seguridad de tu cuenta de administrador.
        </p>
      </div>

      {/* Datos del administrador */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="font-['Barlow',sans-serif] text-base font-bold text-[#1C1C1C] uppercase tracking-wider mb-4">
          Información del perfil
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs uppercase text-[#4A4A4A] font-medium">Nombre</dt>
            <dd className="mt-1 font-semibold text-[#1C1C1C]">{admin?.name ?? session.user.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-[#4A4A4A] font-medium">Correo electrónico</dt>
            <dd className="mt-1 font-semibold text-[#1C1C1C]">{admin?.email ?? session.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-[#4A4A4A] font-medium">Rol asignado</dt>
            <dd className="mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-[#E31C23]">
                {roleLabel}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* Cambio de contraseña */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="mb-6">
          <h2 className="font-['Barlow',sans-serif] text-base font-bold text-[#1C1C1C] uppercase tracking-wider">
            Cambiar mi contraseña
          </h2>
          <p className="mt-1 text-xs text-[#4A4A4A] leading-relaxed">
            Ingresa tu contraseña actual y define una nueva de al menos 10 caracteres. Por seguridad, al cambiar tu contraseña se cerrarán automáticamente todas tus demás sesiones activas en otros dispositivos o navegadores.
          </p>
        </div>

        <ChangePasswordForm />
      </div>
    </div>
  )
}
