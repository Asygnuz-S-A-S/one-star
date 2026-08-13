import "server-only"

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

export interface ERPCatalogVariant {
  erpId: string
  sku: string
  name: string
  /** Texto descriptivo largo del ERP; puede contener talla y color. */
  detailedName?: string
  basePrice: number
  /** `null` significa que la consulta de inventario fue parcial o falló. */
  stock: number | null
  unitOfMeasure?: string
}

export type ERPProductGender =
  | "UNISEX"
  | "HOMBRE"
  | "MUJER"
  | "NINO"
  | "NINA"
  | "INFANTIL"
  | "BEBE"

export interface ERPCatalogProductGroup {
  /** Identidad estable del producto padre en el ERP. */
  erpId: string
  /** Código del producto padre; se usa como slug técnico inicial. */
  sku: string
  name: string
  basePrice: number
  unitOfMeasure?: string
  categoryName?: string
  brandErpId?: string
  /** Clave opaca y namespaced para agrupar colores; el core no interpreta su formato. */
  colorFamilyKey?: string
  variants: ERPCatalogVariant[]
}

export interface ERPCatalogSnapshot {
  groups: ERPCatalogProductGroup[]
  diagnostics: {
    sourceItemCount: number
    definitionCount: number
    variantCount: number
    groupCount: number
  }
  stock: {
    status: "complete" | "partial" | "all_zero"
    complete: boolean
    requestedCount: number
    resolvedCount: number
    totalStock: number
    missingCodes: string[]
    errors: string[]
  }
}

export interface ERPCatalogSyncResult {
  success: boolean
  processedCount: number
  productCount?: number
  variantCount?: number
  definitionCount?: number
  dryRun?: boolean
  warnings?: string[]
  colorFamilies?: {
    created: number
    updated: number
    omitted: number
  }
  error?: string
}

export type ERPEndpointName = "connection" | "catalog" | "stock"
export type ERPEndpointStatus = "healthy" | "warning" | "error" | "unsupported"

/** Resultado seguro y serializable de un probe de solo lectura. */
export interface ERPEndpointDiagnostic {
  endpoint: ERPEndpointName
  status: ERPEndpointStatus
  /** Código HTTP del endpoint probado; null cuando no se alcanzó a llamar. */
  httpStatus: number | null
  latencyMs: number
  /** Resumen operacional; nunca contiene cuerpos crudos ni credenciales. */
  detail: string
}

export interface ERPEndpointDiagnostics {
  checkedAt: string
  results: ERPEndpointDiagnostic[]
}
