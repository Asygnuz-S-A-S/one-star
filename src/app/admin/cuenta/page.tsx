import { getAdminSession } from "@/server/auth/require-admin"
import { findAdminById } from "@/server/repositories/admin.repository"
import { roleCanAccessArea } from "@/lib/admin-access"
import { listMcpTokensFor } from "@/server/services/mcp-token.service"
import { listMcpAuditLogs } from "@/server/repositories/mcp.repository"
import ChangePasswordForm from "./ChangePasswordForm"
import McpTokensSection from "./McpTokensSection"

export const dynamic = "force-dynamic"

export default async function AdminCuentaPage() {
  // "Mi cuenta" es de CUALQUIER rol (cambiar la propia contraseña), no solo Super Admin.
  const session = await getAdminSession()
  if (!session) {
    return <div className="p-8 text-gray-600">No autorizado.</div>
  }
  const admin = await findAdminById(session.user.id)
  const actor = { id: session.user.id, role: session.user.adminRole }
  const canUseMcp = roleCanAccessArea(actor.role, "inventory")
  const isSuperAdmin = actor.role === "SUPER_ADMIN"
  const [mcpTokens, mcpAudit] = await Promise.all([
    canUseMcp ? listMcpTokensFor(actor) : Promise.resolve([]),
    isSuperAdmin ? listMcpAuditLogs(50) : Promise.resolve([]),
  ])

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

      {canUseMcp && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="mb-6">
            <h2 className="font-['Barlow',sans-serif] text-base font-bold text-[#1C1C1C] uppercase tracking-wider">
              Conectar con Claude
            </h2>
            <p className="mt-1 text-xs text-[#4A4A4A] leading-relaxed">
              Crea un token para que Claude edite el catálogo y el contenido por ti. Nunca tiene acceso a pedidos ni a datos de clientes.
              Trátalo como una contraseña: si se pierde, revócalo.
            </p>
          </div>
          <McpTokensSection
            isSuperAdmin={isSuperAdmin}
            tokens={mcpTokens.map((t) => ({
              id: t.id,
              name: t.name,
              prefix: t.prefix,
              role: t.role,
              owner: t.adminUser.email,
              expiresAt: t.expiresAt.toISOString(),
              lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
              revokedAt: t.revokedAt?.toISOString() ?? null,
            }))}
          />
        </div>
      )}

      {isSuperAdmin && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="font-['Barlow',sans-serif] text-base font-bold text-[#1C1C1C] uppercase tracking-wider mb-4">
            Bitácora de Claude
          </h2>
          {mcpAudit.length === 0 ? (
            <p className="text-xs text-[#4A4A4A]">Todavía no hay cambios hechos con Claude.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-montserrat text-xs">
                <thead className="text-[#4A4A4A] uppercase">
                  <tr>
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Admin</th>
                    <th className="py-2 pr-3">Herramienta</th>
                    <th className="py-2">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {mcpAudit.map((log) => (
                    <tr key={log.id} className="border-t border-gray-100 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{log.createdAt.toLocaleString("es-CO")}</td>
                      <td className="py-2 pr-3">{log.token.adminUser.email}</td>
                      <td className="py-2 pr-3 font-mono">{log.tool}</td>
                      <td className="py-2">{log.ok ? "OK" : <span className="text-[#E31C23]">{log.error}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
