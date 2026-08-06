import { describe, expect, it } from "vitest"

import { formatErpSyncCount } from "../erp-sync-display"

describe("formatErpSyncCount", () => {
  it("distingue productos y variantes en resultados nuevos y registros ERP en el historial legado", () => {
    expect(
      formatErpSyncCount({ processedCount: 367, productCount: 367, variantCount: 1530 })
    ).toBe("367 productos · 1530 variantes")
    expect(formatErpSyncCount({ processedCount: 1897 })).toBe("1897 registros ERP")
  })
})
