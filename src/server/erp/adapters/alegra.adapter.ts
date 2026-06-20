import type { IERPAdapter } from "../ports/erp.port"
import type {
  ERPCustomer,
  ERPInvoice,
  ERPSyncResult,
  ERPStockItem,
} from "../erp.types"
import { AlegraClient } from "./alegra.client"

/**
 * Adaptador ERP para Alegra.
 *
 * Implementa IERPAdapter usando la API REST de Alegra.
 * Solo este archivo conoce los detalles de Alegra.
 * Todo el código de negocio interactúa con IERPAdapter.
 *
 * Configuración requerida en .env:
 *   ALEGRA_EMAIL=tu@email.com
 *   ALEGRA_API_KEY=xxxxxxxxxxxxxxxx
 */
export class AlegraERPAdapter implements IERPAdapter {
  private client: AlegraClient

  constructor(email: string, apiKey: string) {
    this.client = new AlegraClient(email, apiKey)
  }

  // ── onOrderConfirmed ─────────────────────────────────────────────────────────

  /**
   * Al confirmar un pedido:
   * 1. Upsert del cliente en Alegra
   * 2. Crea la factura de venta
   * 3. Ajusta el inventario (decremento por las unidades vendidas)
   *
   * Modo degradado: si algún paso falla se loguea pero NO se lanza excepción.
   * El pedido en One Star siempre queda registrado.
   */
  async onOrderConfirmed(invoice: ERPInvoice): Promise<ERPSyncResult> {
    try {
      // Paso 1: Upsert del cliente
      const contact = await this.client.upsertContact(invoice.customer)

      // Paso 2: Crear factura
      const alegraInvoice = await this.client.createInvoice({
        contact,
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
        `[AlegraERP] Pedido ${invoice.orderId} → Factura Alegra #${alegraInvoice.id} creada ✓`
      )

      return {
        success: true,
        erpInvoiceId: String(alegraInvoice.id),
        erpCustomerId: String(contact.id),
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[AlegraERP] onOrderConfirmed falló para pedido ${invoice.orderId}:`, message)
      return { success: false, error: message }
    }
  }

  // ── decrementStock ───────────────────────────────────────────────────────────

  async decrementStock(
    items: { sku: string; qty: number }[]
  ): Promise<ERPSyncResult> {
    try {
      await this.client.adjustInventory(items)
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[AlegraERP] decrementStock falló:", message)
      return { success: false, error: message }
    }
  }

  // ── getStockBySku ────────────────────────────────────────────────────────────

  async getStockBySku(sku: string): Promise<number | null> {
    return this.client.getStockBySku(sku)
  }

  // ── getBulkStock ─────────────────────────────────────────────────────────────

  async getBulkStock(skus: string[]): Promise<ERPStockItem[]> {
    return this.client.getBulkStock(skus)
  }

  // ── upsertCustomer ───────────────────────────────────────────────────────────

  async upsertCustomer(customer: ERPCustomer): Promise<ERPSyncResult> {
    try {
      const contact = await this.client.upsertContact(customer)
      return { success: true, erpCustomerId: String(contact.id) }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[AlegraERP] upsertCustomer falló:", message)
      return { success: false, error: message }
    }
  }

  // ── ping ─────────────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    return this.client.ping()
  }
}
