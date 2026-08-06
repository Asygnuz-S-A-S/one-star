import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  ERP_SYNC_INTERVALS,
  erpSyncConfigInputSchema,
} from "../erp-sync-config.validator"

describe("erpSyncConfigInputSchema", () => {
  it("acepta únicamente las frecuencias administrables aprobadas", () => {
    expect(ERP_SYNC_INTERVALS).toEqual([15, 30, 60, 120, 360, 720, 1440])

    for (const intervalMinutes of ERP_SYNC_INTERVALS) {
      expect(
        erpSyncConfigInputSchema.safeParse({ enabled: true, intervalMinutes }).success
      ).toBe(true)
    }

    expect(
      erpSyncConfigInputSchema.safeParse({ enabled: true, intervalMinutes: 45 }).success
    ).toBe(false)
  })
})
