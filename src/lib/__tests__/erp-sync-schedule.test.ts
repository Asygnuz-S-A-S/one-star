import { describe, expect, it } from "vitest"

import { scheduleDraftFromSnapshot } from "../erp-sync-schedule"

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
