import "server-only"

import {
  getERPAdapter,
  supportsCatalogSync,
  type ERPCatalogSyncResult,
} from "@/server/erp"
import {
  claimDueErpSync,
  disableErpSyncSchedule,
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
  | { executed: false; reason: "catalog_sync_unavailable" }
  | { executed: true; result: ERPCatalogSyncResult }

export const CATALOG_SYNC_UNAVAILABLE_MESSAGE =
  "El ERP configurado no ofrece sincronización de catálogo. Conecta un ERP compatible antes de activar la programación automática."

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

function needsCapabilityReconciliation(config: {
  enabled: boolean
  nextRunAt: Date | null
}): boolean {
  return config.enabled || config.nextRunAt !== null
}

export async function getErpSyncSchedule(now = new Date()): Promise<ErpSyncScheduleDTO> {
  const config = await getOrCreateErpSyncConfig(now)

  if (
    !supportsCatalogSync(getERPAdapter()) &&
    needsCapabilityReconciliation(config)
  ) {
    return toDTO(await disableErpSyncSchedule(config.updatedAt))
  }

  return toDTO(config)
}

export async function updateErpSyncSchedule(
  input: ErpSyncConfigInput,
  now = new Date()
): Promise<ErpSyncScheduleDTO> {
  const parsed = erpSyncConfigInputSchema.parse(input)

  if (parsed.enabled && !supportsCatalogSync(getERPAdapter())) {
    throw new Error(CATALOG_SYNC_UNAVAILABLE_MESSAGE)
  }

  return toDTO(await saveErpSyncConfig(parsed, now))
}

/**
 * Coordinador compartido por el despertador interno y el endpoint externo.
 * Solo quien obtiene el UPDATE atómico llama al ERP.
 */
export async function runDueErpSync(now = new Date()): Promise<DueErpSyncResult> {
  const config = await getOrCreateErpSyncConfig(now)

  if (!supportsCatalogSync(getERPAdapter())) {
    if (needsCapabilityReconciliation(config)) {
      await disableErpSyncSchedule(config.updatedAt)
    }
    return { executed: false, reason: "catalog_sync_unavailable" }
  }

  const claimed = await claimDueErpSync(now)

  if (!claimed) {
    return { executed: false, reason: "disabled_or_not_due" }
  }

  const { syncCatalogFromERP } = await import("@/server/services/erp-sync.service")
  return { executed: true, result: await syncCatalogFromERP("AUTO") }
}
