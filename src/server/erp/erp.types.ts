/**
 * Tipos compartidos de la capa ERP.
 *
 * Estos tipos son los únicos que circulan entre el core del e-commerce y
 * los adaptadores ERP. Nunca deben importarse tipos específicos de Alegra,
 * Siigo u otro ERP en el código de negocio.
 */

export interface ERPCustomer {
  /** ID del cliente en el ERP si ya fue sincronizado antes */
  erpId?: string
  name: string
  email: string
  /** Cédula / NIT */
  idNumber?: string
  phone?: string
  address?: string
}

export interface ERPOrderItem {
  sku: string
  productName: string
  quantity: number
  /** Precio unitario en COP */
  unitPrice: number
}

export interface ERPInvoice {
  /** ID del pedido en One Star (para trazabilidad) */
  orderId: string
  customer: ERPCustomer
  items: ERPOrderItem[]
  /** Total en COP */
  total: number
  /** e.g. "epayco" | "mercadopago" | "addi" | "pending" */
  paymentMethod: string
  /** Dirección de envío serializada */
  shippingAddress?: Record<string, unknown>
}

export interface ERPSyncResult {
  success: boolean
  /** ID de la factura creada en el ERP, si aplica */
  erpInvoiceId?: string
  /** ID del cliente en el ERP, si aplica */
  erpCustomerId?: string
  /** Mensaje de error, si success === false */
  error?: string
}

export interface ERPStockItem {
  sku: string
  /** Stock actual en el ERP */
  stock: number
}

export interface ERPProduct {
  erpId: string
  sku: string
  name: string
  basePrice: number
  stock: number
  unitOfMeasure?: string
  categoryName?: string
  brandErpId?: string
}

export interface ERPCatalogSyncResult {
  success: boolean
  processedCount: number
  error?: string
}

