import "server-only"

import type { IERPAdapter } from "../ports/erp.port"
import type {
  ERPCatalogSnapshot,
  ERPCustomer,
  ERPEndpointDiagnostic,
  ERPInvoice,
  ERPSyncResult,
  ERPStockItem,
  ERPStockLocation,
} from "../erp.types"
import { LoggroClient } from "./loggro.client"
import { normalizeLoggroCatalog } from "./loggro-catalog.normalizer"

/**
 * Adaptador ERP para Loggro Pymes.
 *
 * Implementa IERPAdapter usando la API REST de Loggro.
 * Solo este archivo conoce los detalles de Loggro.
 * Todo el código de negocio interactúa con IERPAdapter.
 *
 * Configuración requerida en .env:
 *   LOGGRO_API_TOKEN=xxxxxxxxxxxxxxxx
 */
export class LoggroERPAdapter implements IERPAdapter {
  private client: LoggroClient

  constructor(token: string, client?: LoggroClient) {
    this.client = client ?? new LoggroClient(token)
  }

  async onOrderConfirmed(invoice: ERPInvoice): Promise<ERPSyncResult> {
    try {
      // Descuenta el stock en Loggro registrando una SALIDA de inventario.
      // La facturación electrónica y el upsert de cliente quedan PENDIENTES
      // (sus endpoints aún no están mapeados a Loggro real): no se invocan aquí
      // para no bloquear el descuento de inventario, que es lo crítico para
      // mantener las existencias sincronizadas.
      const salidaUuid = await this.client.createSalida(
        invoice.items.map((i) => ({ sku: i.sku, qty: i.quantity }))
      )

      console.info(
        `[LoggroERP] Pedido ${invoice.orderId} → salida de inventario ${salidaUuid ?? "(sin ítems)"} ✓`
      )

      return { success: true, erpInvoiceId: salidaUuid ?? undefined }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[LoggroERP] onOrderConfirmed falló para pedido ${invoice.orderId}:`, message)
      return { success: false, error: message }
    }
  }

  async decrementStock(
    items: { sku: string; qty: number }[]
  ): Promise<ERPSyncResult> {
    try {
      await this.client.adjustInventory(items)
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[LoggroERP] decrementStock falló:", message)
      return { success: false, error: message }
    }
  }

  async getStockBySku(sku: string): Promise<number | null> {
    return this.client.getStockBySku(sku)
  }

  async validateStock(items: { sku: string; qty: number }[]): Promise<boolean> {
    try {
      const skus = items.map((i) => i.sku)
      const stocks = await this.client.getBulkStock(skus)
      
      for (const item of items) {
        const erpStock = stocks.find((s) => s.sku === item.sku)
        if (!erpStock || erpStock.stock < item.qty) {
          return false
        }
      }
      return true
    } catch (err) {
      console.error("[LoggroERP] validateStock falló:", err)
      // Si el ERP falla temporalmente, podríamos decidir dejar pasar la compra
      // o bloquearla. Para estricto inventario, devolvemos false.
      return false
    }
  }

  async getBulkStock(skus: string[]): Promise<ERPStockItem[]> {
    return this.client.getBulkStock(skus)
  }

  async upsertCustomer(customer: ERPCustomer): Promise<ERPSyncResult> {
    try {
      const loggroCustomer = await this.client.upsertCustomer(customer)
      return { success: true, erpCustomerId: String(loggroCustomer.id) }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[LoggroERP] upsertCustomer falló:", message)
      return { success: false, error: message }
    }
  }

  async ping(): Promise<boolean> {
    return this.client.ping()
  }

  async diagnoseEndpoints(): Promise<ERPEndpointDiagnostic[]> {
    return this.client.diagnoseEndpoints()
  }

  async listStockLocations(): Promise<ERPStockLocation[]> {
    return this.client.listStockLocations()
  }

  async fetchCatalog(): Promise<ERPCatalogSnapshot> {
    const loggroItems = await this.client.getProducts()

    // El catálogo (/items) NO trae existencias: el stock se consulta aparte
    // contra el endpoint de disponibilidad y se cruza por código de ítem.
    const codigos = loggroItems
      .filter((item) => item.definicion !== true)
      .map((item) => String(item.codigo ?? ""))
      .filter(Boolean)
    const stock = await this.client.getDisponibilidadSnapshot(codigos)

    return normalizeLoggroCatalog(loggroItems, stock)
  }
}
