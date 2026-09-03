import "server-only"

import type { IERPAdapter } from "./ports/erp.port"

export function supportsCatalogSync(adapter: IERPAdapter): boolean {
  return typeof adapter.fetchCatalog === "function"
}
