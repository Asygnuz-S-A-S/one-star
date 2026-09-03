import "server-only"

import { z } from "zod"

import { ERP_SYNC_INTERVALS } from "@/lib/erp-sync-schedule"
import type { ErpSyncInterval } from "@/lib/erp-sync-schedule"

export { ERP_SYNC_INTERVALS }
export type { ErpSyncInterval }

export const erpSyncConfigInputSchema = z.object({
  enabled: z.boolean(),
  intervalMinutes: z.number().int().refine(
    (value): value is ErpSyncInterval =>
      ERP_SYNC_INTERVALS.some((interval) => interval === value),
    "Selecciona una frecuencia de sincronización válida."
  ),
})

export type ErpSyncConfigInput = z.infer<typeof erpSyncConfigInputSchema>
