import type { IERPAdapter } from "../ports/erp.port"
import type {
  ERPCustomer,
  ERPInvoice,
  ERPSyncResult,
  ERPStockItem,
} from "../erp.types"

/**
 * Adaptador nulo — no hace nada y siempre retorna éxito.
 *
 * Úsalo cuando:
 *   - ERP_PROVIDER=null (entorno local de desarrollo)
 *   - En tests unitarios (no queremos llamadas reales)
 *   - Como fallback temporal mientras se configura un ERP real
 *
 * Garantiza que el e-commerce funcione aunque no haya ERP conectado.
 */
export class NullERPAdapter implements IERPAdapter {
  async onOrderConfirmed(invoice: ERPInvoice): Promise<ERPSyncResult> {
    console.info(
      `[NullERP] onOrderConfirmed — order "${invoice.orderId}" ignorado (sin ERP configurado)`
    )
    return { success: true }
  }

  async decrementStock(
    items: { sku: string; qty: number }[]
  ): Promise<ERPSyncResult> {
    console.info(
      `[NullERP] decrementStock — ${items.length} SKU(s) ignorados (sin ERP configurado)`
    )
    return { success: true }
  }

  async getStockBySku(_sku: string): Promise<number | null> {
    return null
  }

  async getBulkStock(_skus: string[]): Promise<ERPStockItem[]> {
    return []
  }

  async upsertCustomer(_customer: ERPCustomer): Promise<ERPSyncResult> {
    return { success: true }
  }

  async ping(): Promise<boolean> {
    return true
  }
}
