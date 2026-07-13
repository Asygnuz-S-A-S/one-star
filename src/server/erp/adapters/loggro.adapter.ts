import type { IERPAdapter } from "../ports/erp.port"
import type {
  ERPCustomer,
  ERPInvoice,
  ERPSyncResult,
  ERPStockItem,
} from "../erp.types"
import { LoggroClient } from "./loggro.client"

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

  constructor(token: string) {
    this.client = new LoggroClient(token)
  }

  async onOrderConfirmed(invoice: ERPInvoice): Promise<ERPSyncResult> {
    try {
      // Paso 1: Upsert del cliente
      const customer = await this.client.upsertCustomer(invoice.customer)

      // Paso 2: Crear factura
      const loggroInvoice = await this.client.createInvoice({
        customer,
        items: invoice.items,
        total: invoice.total,
        paymentMethod: invoice.paymentMethod,
        orderId: invoice.orderId,
      })

      // Paso 3: Ajustar inventario
      await this.client.adjustInventory(
        invoice.items.map((i) => ({ sku: i.sku, qty: i.quantity }))
      )

      console.info(
        `[LoggroERP] Pedido ${invoice.orderId} → Factura Loggro #${loggroInvoice.id} creada ✓`
      )

      return {
        success: true,
        erpInvoiceId: String(loggroInvoice.id),
        erpCustomerId: String(customer.id),
      }
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

  async fetchCatalog(): Promise<import("../erp.types").ERPProduct[]> {
    const loggroItems = await this.client.getProducts()
    
    // Mapear los items de Loggro a ERPProduct
    return loggroItems.map((item) => ({
      erpId: String(item.id ?? item.codigo ?? ""),
      sku: String(item.codigo ?? item.id ?? ""),
      name: item.descripcion || "Sin Nombre",
      basePrice: Number(item.precioDefecto || item.precioBase || item.precioVta || 0),
      stock: item.cantidadDisponible || item.cantDisp || 0,
      unitOfMeasure: item.codigoUnidad || item.unidadMedida ? String(item.codigoUnidad || item.unidadMedida) : undefined,
      categoryName: item.categoria || item.nombreCategoria || item.codigoCategoria || undefined,
      brandErpId: item.codigoCategoria || item.categoriaProducto_uuid || undefined,
    }))
  }
}
