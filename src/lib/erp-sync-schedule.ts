export const ERP_SYNC_INTERVALS = [15, 30, 60, 120, 360, 720, 1440] as const

export type ErpSyncInterval = (typeof ERP_SYNC_INTERVALS)[number]

export interface ErpSyncScheduleSnapshot {
  enabled: boolean
  intervalMinutes: ErpSyncInterval
  nextRunAt: string | null
}

/** Recupera los valores editables desde la última configuración confirmada. */
export function scheduleDraftFromSnapshot(snapshot: ErpSyncScheduleSnapshot) {
  return {
    enabled: snapshot.enabled,
    intervalMinutes: snapshot.intervalMinutes,
  }
}

/** Fuerza un remount del editor únicamente cuando cambia la verdad persistida. */
export function erpSyncScheduleSnapshotKey(snapshot: ErpSyncScheduleSnapshot): string {
  return `${snapshot.enabled}:${snapshot.intervalMinutes}:${snapshot.nextRunAt ?? "none"}`
}
