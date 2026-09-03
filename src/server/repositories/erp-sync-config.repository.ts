import "server-only"

import type { ErpSyncConfig } from "@prisma/client"

import { prisma } from "@/server/db/prisma"
import type { ErpSyncConfigInput } from "@/server/validators/erp-sync-config.validator"

export const ERP_SYNC_CONFIG_ID = "default"
export const DEFAULT_ERP_SYNC_INTERVAL_MINUTES = 30

function nextRunAt(now: Date, intervalMinutes: number): Date {
  return new Date(now.getTime() + intervalMinutes * 60_000)
}

export async function getOrCreateErpSyncConfig(now = new Date()): Promise<ErpSyncConfig> {
  return prisma.erpSyncConfig.upsert({
    where: { id: ERP_SYNC_CONFIG_ID },
    update: {},
    create: {
      id: ERP_SYNC_CONFIG_ID,
      enabled: true,
      intervalMinutes: DEFAULT_ERP_SYNC_INTERVAL_MINUTES,
      nextRunAt: nextRunAt(now, DEFAULT_ERP_SYNC_INTERVAL_MINUTES),
    },
  })
}

export async function saveErpSyncConfig(
  input: ErpSyncConfigInput,
  now = new Date()
): Promise<ErpSyncConfig> {
  return prisma.erpSyncConfig.upsert({
    where: { id: ERP_SYNC_CONFIG_ID },
    update: {
      enabled: input.enabled,
      intervalMinutes: input.intervalMinutes,
      nextRunAt: input.enabled ? nextRunAt(now, input.intervalMinutes) : null,
    },
    create: {
      id: ERP_SYNC_CONFIG_ID,
      enabled: input.enabled,
      intervalMinutes: input.intervalMinutes,
      nextRunAt: input.enabled ? nextRunAt(now, input.intervalMinutes) : null,
    },
  })
}

/**
 * Reconcilia una programación incompatible sin reescribir su frecuencia.
 * También limpia vencimientos residuales de configuraciones ya inactivas.
 */
export async function disableErpSyncSchedule(expectedUpdatedAt: Date): Promise<ErpSyncConfig> {
  await prisma.erpSyncConfig.updateMany({
    where: { id: ERP_SYNC_CONFIG_ID, updatedAt: expectedUpdatedAt },
    data: { enabled: false, nextRunAt: null },
  })

  return prisma.erpSyncConfig.findUniqueOrThrow({
    where: { id: ERP_SYNC_CONFIG_ID },
  })
}

/**
 * Reclama y adelanta un vencimiento en una sola sentencia. La transacción
 * termina antes de cualquier llamada HTTP al ERP.
 */
export async function claimDueErpSync(now = new Date()): Promise<ErpSyncConfig | null> {
  return claimDueErpSyncWithClient(prisma, now)
}

/** Variante inyectable para comprobar la exclusión con conexiones PostgreSQL independientes. */
export async function claimDueErpSyncWithClient(
  client: Pick<typeof prisma, "$queryRaw">,
  now = new Date()
): Promise<ErpSyncConfig | null> {
  const claimed = await client.$queryRaw<ErpSyncConfig[]>`
    UPDATE "ErpSyncConfig"
       SET "nextRunAt" = ${now} + make_interval(mins => "intervalMinutes"),
           "updatedAt" = ${now}
     WHERE "id" = ${ERP_SYNC_CONFIG_ID}
       AND "enabled" = TRUE
       AND "nextRunAt" IS NOT NULL
       AND "nextRunAt" <= ${now}
    RETURNING "id", "enabled", "intervalMinutes", "nextRunAt", "createdAt", "updatedAt"
  `

  return claimed[0] ?? null
}
