export const ERP_SYNC_INTERVALS = [15, 30, 60, 120, 360, 720, 1440] as const

export type ErpSyncInterval = (typeof ERP_SYNC_INTERVALS)[number]
