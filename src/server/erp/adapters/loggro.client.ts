/**
 * Cliente HTTP para la API REST de Loggro Pymes.
 *
 * Documentación oficial: https://developer.loggro.com/
 *
 * Autenticación:
 *   Authorization: Bearer <TOKEN>
 *   Content-Type: application/json
 */

import type { ERPCustomer, ERPOrderItem, ERPStockItem } from "../erp.types"

// Base URL oficial para el API Pymes de Loggro
const LOGGRO_BASE_URL = (process.env.LOGGRO_BASE_URL || "https://api.loggro.com").replace(/\/$/, "")

// ─── Tipos internos de la API de Loggro ──────────────────────────────────────

interface LoggroCustomer {
  id: string
  name: string
  email?: string
}

interface LoggroInvoice {
  id: string
  number?: string
  total?: number
}

interface LoggroItem {
  id: string
  code?: string
  stock?: number
}

/** Unidad de medida del catálogo Loggro */
export interface LoggroUnidadMedida {
  codigo?: string
  nombre?: string
  [key: string]: unknown
}

/** Item del catálogo Loggro — campos observados en la API real */
export interface LoggroCatalogItem {
  id?: string
  codigo?: string
  descripcion?: string
  precioDefecto?: number | string
  precioBase?: number | string
  precioVta?: number | string
  cantidadDisponible?: number
  cantDisp?: number
  codigoUnidad?: string | number
  unidadMedida?: string | number
  categoria?: string
  nombreCategoria?: string
  codigoCategoria?: string
  categoriaProducto_uuid?: string
}

/** Respuesta paginada del endpoint de items */
interface LoggroCatalogResponse {
  contenido?: { content?: LoggroCatalogItem[] }
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

export class LoggroClient {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${LOGGRO_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`[LoggroClient] ${method} ${path} → ${res.status}: ${text}`)
    }

    return res.json() as Promise<T>
  }

  // ── Healthcheck ──────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    try {
      await this.request("GET", "/taxes")
      return true
    } catch {
      return false
    }
  }

  // ── Contactos (clientes) ─────────────────────────────────────────────────────

  async findCustomerByEmail(email: string): Promise<LoggroCustomer | null> {
    try {
      const results = await this.request<LoggroCustomer[]>(
        "GET",
        `/customers?email=${encodeURIComponent(email)}`
      )
      return results[0] ?? null
    } catch {
      return null
    }
  }

  async createCustomer(customer: ERPCustomer): Promise<LoggroCustomer> {
    return this.request<LoggroCustomer>("POST", "/customers", {
      name: customer.name,
      email: customer.email,
      documentNumber: customer.idNumber,
      phone: customer.phone,
    })
  }

  async upsertCustomer(customer: ERPCustomer): Promise<LoggroCustomer> {
    const existing = await this.findCustomerByEmail(customer.email)
    if (existing) return existing
    return this.createCustomer(customer)
  }

  // ── Facturas ─────────────────────────────────────────────────────────────────

  async createInvoice(params: {
    customer: LoggroCustomer
    items: ERPOrderItem[]
    total: number
    paymentMethod: string
    orderId: string
  }): Promise<LoggroInvoice> {
    const loggroItems = params.items.map((item) => ({
      name: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }))

    return this.request<LoggroInvoice>("POST", "/invoices", {
      customerId: params.customer.id,
      date: new Date().toISOString().split("T")[0],
      items: loggroItems,
      observations: `Pedido One Star #${params.orderId} — Pago: ${params.paymentMethod}`,
    })
  }

  // ── Inventario ───────────────────────────────────────────────────────────────

  async findItemBySku(sku: string): Promise<LoggroItem | null> {
    try {
      // Usar endpoint real de items si difiere
      const results = await this.request<LoggroItem[]>(
        "GET",
        `/apik/loggro-inventario/v1/items?sku=${encodeURIComponent(sku)}`
      )
      return results[0] ?? null
    } catch {
      return null
    }
  }

  // ── Sincronización de Catálogo ───────────────────────────────────────────────


  async getUnidadesMedida(): Promise<LoggroUnidadMedida[]> {
    try {
      const results = await this.request<LoggroUnidadMedida[]>(
        "GET",
        "/apik/loggro-inventario/v1/productos/unidades-medida"
      )
      return results
    } catch (err) {
      console.error("[LoggroClient] Error al obtener unidades de medida:", err)
      return []
    }
  }

  async getProducts(): Promise<LoggroCatalogItem[]> {
    try {
      const results = await this.request<LoggroCatalogResponse>(
        "GET",
        "/apik/loggro-inventario/v1/items"
      )
      return results?.contenido?.content || []
    } catch (err) {
      console.error("[LoggroClient] Error al obtener productos:", err)
      return []
    }
  }

  async getStockBySku(sku: string): Promise<number | null> {
    const item = await this.findItemBySku(sku)
    return item?.stock ?? null
  }

  async adjustInventory(
    items: { sku: string; qty: number }[]
  ): Promise<void> {
    await Promise.allSettled(
      items.map(async ({ sku, qty }) => {
        const item = await this.findItemBySku(sku)
        if (!item) {
          console.warn(`[LoggroClient] SKU "${sku}" no encontrado en Loggro — stock no ajustado`)
          return
        }

        await this.request("POST", "/inventory/adjustments", {
          date: new Date().toISOString().split("T")[0],
          observations: `Venta One Star — SKU: ${sku}`,
          items: [
            {
              id: item.id,
              quantity: -qty, // negativo = egreso
            },
          ],
        })
      })
    )
  }

  async getBulkStock(skus: string[]): Promise<ERPStockItem[]> {
    const results: ERPStockItem[] = []
    try {
      const items = await this.request<LoggroItem[]>("GET", "/items")
      const skuSet = new Set(skus)
      for (const item of items) {
        if (item.code && skuSet.has(item.code)) {
          results.push({
            sku: item.code,
            stock: item.stock ?? 0,
          })
        }
      }
    } catch (err) {
      console.error("[LoggroClient] getBulkStock failed:", err)
    }
    return results
  }
}
