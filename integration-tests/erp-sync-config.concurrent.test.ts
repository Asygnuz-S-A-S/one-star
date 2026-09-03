import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { loadEnvConfig } from "@next/env"
import { PrismaClient } from "@prisma/client"

vi.mock("server-only", () => ({}))

loadEnvConfig(process.cwd())

import { claimDueErpSyncWithClient } from "@/server/repositories/erp-sync-config.repository"

const schemaName = `erp_sync_claim_${Date.now()}_${Math.random().toString(36).slice(2)}`
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL es obligatoria para la prueba de integración del scheduler ERP.")
}

const admin = new PrismaClient({ datasourceUrl: databaseUrl })
const schemaUrl = new URL(databaseUrl)
schemaUrl.searchParams.set("schema", schemaName)
const claimantA = new PrismaClient({ datasourceUrl: schemaUrl.toString() })
const claimantB = new PrismaClient({ datasourceUrl: schemaUrl.toString() })

describe("claimDueErpSyncWithClient con PostgreSQL", () => {
  beforeAll(async () => {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`)
    await claimantA.$executeRawUnsafe(`
      CREATE TABLE "ErpSyncConfig" (
        "id" TEXT PRIMARY KEY,
        "enabled" BOOLEAN NOT NULL,
        "intervalMinutes" INTEGER NOT NULL,
        "nextRunAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL
      )
    `)
  })

  afterAll(async () => {
    await claimantA.$disconnect()
    await claimantB.$disconnect()
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
    await admin.$disconnect()
  })

  it("permite que solo una conexión reclame el mismo vencimiento", async () => {
    const now = new Date("2026-08-06T12:00:00.000Z")
    await claimantA.erpSyncConfig.create({
      data: {
        id: "default",
        enabled: true,
        intervalMinutes: 30,
        nextRunAt: new Date("2026-08-06T11:59:00.000Z"),
        createdAt: new Date("2026-08-06T11:00:00.000Z"),
        updatedAt: new Date("2026-08-06T11:00:00.000Z"),
      },
    })

    const claims = await Promise.all([
      claimDueErpSyncWithClient(claimantA, now),
      claimDueErpSyncWithClient(claimantB, now),
    ])

    expect(claims.filter(Boolean)).toHaveLength(1)
    expect(claims.find(Boolean)?.nextRunAt).toEqual(new Date("2026-08-06T12:30:00.000Z"))
  })
})
