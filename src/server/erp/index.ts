import "server-only"

/**
 * Barrel export de la capa ERP.
 *
 * El código de negocio (services, actions) importa desde aquí:
 *   import { getERPAdapter } from "@/server/erp"
 *   import type { IERPAdapter, ERPInvoice } from "@/server/erp"
 *
 * NUNCA importar directamente de adaptadores o clientes específicos.
 */

export { getERPAdapter, resetERPAdapter } from "./erp.container"
export type { IERPAdapter } from "./ports/erp.port"
export type {
  ERPCustomer,
  ERPInvoice,
  ERPOrderItem,
  ERPSyncResult,
  ERPStockItem,
  ERPEndpointDiagnostic,
  ERPEndpointDiagnostics,
  ERPEndpointName,
  ERPEndpointStatus,
} from "./erp.types"
