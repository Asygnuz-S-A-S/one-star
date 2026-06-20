import type {
  ERPCustomer,
  ERPInvoice,
  ERPSyncResult,
  ERPStockItem,
} from "../erp.types"

/**
 * Contrato (Port) que TODOS los adaptadores ERP deben implementar.
 *
 * El core del e-commerce (services, actions) únicamente interactúa con esta
 * interfaz. Nunca con AlegraAdapter, SiigoAdapter u otro directamente.
 *
 * Para agregar un nuevo ERP:
 *   1. Crear `src/server/erp/adapters/<nombre>.adapter.ts`
 *   2. Implementar esta interfaz
 *   3. Registrar el nuevo case en `erp.container.ts`
 *   4. Añadir las variables de entorno necesarias
 *
 * Nada más cambia.
 */
export interface IERPAdapter {
  /**
   * Se invoca cuando un pedido es confirmado/pagado.
   * Responsabilidades típicas:
   *   - Upsert del cliente/contacto en el ERP
   *   - Creación de la factura de venta
   *   - Registro del movimiento de inventario
   */
  onOrderConfirmed(invoice: ERPInvoice): Promise<ERPSyncResult>

  /**
   * Descuenta el stock de múltiples variantes en el ERP.
   * Se llama al reservar / confirmar un pedido.
   *
   * @param items Lista de { sku, qty } a descontar
   */
  decrementStock(items: { sku: string; qty: number }[]): Promise<ERPSyncResult>

  /**
   * Consulta el stock actual de una variante desde el ERP.
   * Útil para sincronización bidireccional (ventas físicas POS → web).
   *
   * @returns Stock disponible, o null si el SKU no existe en el ERP
   */
  getStockBySku(sku: string): Promise<number | null>

  /**
   * Consulta el stock de múltiples variantes en una sola llamada.
   * Implementación opcional — el adaptador puede devolver [] si no lo soporta.
   */
  getBulkStock?(skus: string[]): Promise<ERPStockItem[]>

  /**
   * Sincroniza (upsert) un cliente en el ERP.
   * Se puede llamar al registrarse un nuevo usuario en la tienda.
   */
  upsertCustomer(customer: ERPCustomer): Promise<ERPSyncResult>

  /**
   * Healthcheck: verifica si el ERP está disponible.
   * Se usa en el endpoint /api/health y en diagnósticos.
   */
  ping(): Promise<boolean>
}
