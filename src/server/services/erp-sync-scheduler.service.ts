import "server-only"

import type { ERPCatalogSyncResult } from "@/server/erp/erp.types"
import {
  claimDueErpSync,
  getOrCreateErpSyncConfig,
  saveErpSyncConfig,
} from "@/server/repositories/erp-sync-config.repository"
import {
  erpSyncConfigInputSchema,
  type ErpSyncConfigInput,
  type ErpSyncInterval,
} from "@/server/validators/erp-sync-config.validator"

export interface ErpSyncScheduleDTO {
  enabled: boolean
  intervalMinutes: ErpSyncInterval
  nextRunAt: string | null
}

export type DueErpSyncResult =
  | { executed: false; reason: "disabled_or_not_due" }
  | { executed: true; result: ERPCatalogSyncResult }

function toDTO(config: {
  enabled: boolean
  intervalMinutes: number
  nextRunAt: Date | null
}): ErpSyncScheduleDTO {
  const parsed = erpSyncConfigInputSchema.parse({
    enabled: config.enabled,
    intervalMinutes: config.intervalMinutes,
  })

  return {
    enabled: parsed.enabled,
    intervalMinutes: parsed.intervalMinutes as ErpSyncInterval,
    nextRunAt: config.nextRunAt?.toISOString() ?? null,
  }
}

export async function getErpSyncSchedule(now = new Date()): Promise<ErpSyncScheduleDTO> {
  return toDTO(await getOrCreateErpSyncConfig(now))
}

export async function updateErpSyncSchedule(
  input: ErpSyncConfigInput,
  now = new Date()
): Promise<ErpSyncScheduleDTO> {
  const parsed = erpSyncConfigInputSchema.parse(input)
  return toDTO(await saveErpSyncConfig(parsed, now))
}

/**
 * Coordinador compartido por el despertador interno y el endpoint externo.
 * Solo quien obtiene el UPDATE atómico llama al ERP.
 */
export async function runDueErpSync(now = new Date()): Promise<DueErpSyncResult> {
  await getOrCreateErpSyncConfig(now)
  const claimed = await claimDueErpSync(now)

  if (!claimed) {
    return { executed: false, reason: "disabled_or_not_due" }
  }

  const { syncCatalogFromERP } = await import("@/server/services/erp-sync.service")
  return { executed: true, result: await syncCatalogFromERP("AUTO") }
}
