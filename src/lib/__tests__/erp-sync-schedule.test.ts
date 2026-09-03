import { describe, expect, it } from "vitest"

import {
  erpSyncScheduleSnapshotKey,
  scheduleDraftFromSnapshot,
} from "../erp-sync-schedule"

describe("scheduleDraftFromSnapshot", () => {
  it("restaura únicamente los controles editables desde el estado persistido", () => {
    expect(
      scheduleDraftFromSnapshot({
        enabled: true,
        intervalMinutes: 120,
        nextRunAt: "2026-08-06T14:00:00.000Z",
      })
    ).toEqual({ enabled: true, intervalMinutes: 120 })
  })
})

describe("erpSyncScheduleSnapshotKey", () => {
  it("cambia solo cuando cambia la configuración persistida", () => {
    const base = {
      enabled: true,
      intervalMinutes: 30 as const,
      nextRunAt: "2026-08-06T14:00:00.000Z",
    }

    expect(erpSyncScheduleSnapshotKey({ ...base })).toBe(erpSyncScheduleSnapshotKey(base))
    expect(erpSyncScheduleSnapshotKey({ ...base, intervalMinutes: 60 })).not.toBe(
      erpSyncScheduleSnapshotKey(base)
    )
  })
})
