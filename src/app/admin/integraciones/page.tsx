import { getErpSyncStatus } from "@/server/services/erp-sync.service"
import { getAdminSession } from "@/server/auth/require-admin"
import SyncPanel from "@/components/admin/SyncPanel"
import { erpSyncScheduleSnapshotKey } from "@/lib/erp-sync-schedule"

// Datos en vivo (estado del ERP + historial): nunca pre-generar.
export const dynamic = "force-dynamic"

export default async function IntegrationsPage() {
  // Defensa en profundidad: el layout/proxy protegen /admin, pero esta página
  // expone estado del ERP, así que verificamos la sesión de admin aquí también.
  const session = await getAdminSession()
  if (!session) {
    return <div className="p-8 text-gray-600">No autorizado.</div>
  }

  const status = await getErpSyncStatus()
  return (
    <SyncPanel
      key={`${erpSyncScheduleSnapshotKey({
        enabled: status.autoSyncEnabled,
        intervalMinutes: status.autoSyncMinutes,
        nextRunAt: status.nextAutoSyncAt,
      })}:${status.catalogSyncAvailable ? "catalog" : "no-catalog"}`}
      initialStatus={status}
    />
  )
}
