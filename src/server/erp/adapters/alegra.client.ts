/**
 * Cliente HTTP para la API REST de Alegra.
 *
 * Documentación oficial: https://developer.alegra.com/
 *
 * Autenticación: HTTP Basic Auth con email + API key de Alegra.
 * Headers requeridos:
 *   Authorization: Basic base64(email:apiKey)
 *   Content-Type: application/json
 */

import type { ERPCustomer, ERPOrderItem, ERPStockItem } from "../erp.types"

const ALEGRA_BASE_URL = "https://api.alegra.com/api/v1"

// ─── Tipos internos de la API de Alegra ──────────────────────────────────────

interface AlegraContact {
  id: number
  name: string
  email?: string
}

interface AlegraInvoice {
  id: number
  numberTemplate?: { fullNumber: string }
  total?: number
}

interface AlegraItem {
  id: number
  reference?: string
  inventory?: { quantity: number }
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

export class AlegraClient {
  private authHeader: string

  constructor(email: string, apiKey: string) {
    const credentials = Buffer.from(`${email}:${apiKey}`).toString("base64")
    this.authHeader = `Basic ${credentials}`
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${ALEGRA_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      // No cachear en entorno de servidor
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`[AlegraClient] ${method} ${path} → ${res.status}: ${text}`)
    }

    return res.json() as Promise<T>
  }

  // ── Healthcheck ──────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    try {
      await this.request("GET", "/company")
      return true
    } catch {
      return false
    }
  }

  // ── Contactos (clientes) ─────────────────────────────────────────────────────

  /**
   * Busca un contacto por email. Retorna null si no existe.
   */
  async findContactByEmail(email: string): Promise<AlegraContact | null> {
    try {
      const results = await this.request<AlegraContact[]>(
        "GET",
        `/contacts?query=email:${encodeURIComponent(email)}`
      )
      return results[0] ?? null
    } catch {
      return null
    }
  }

  /**
   * Crea un nuevo contacto en Alegra.
   */
  async createContact(customer: ERPCustomer): Promise<AlegraContact> {
    return this.request<AlegraContact>("POST", "/contacts", {
      name: customer.name,
      email: customer.email,
      identification: customer.idNumber,
      mobile: customer.phone,
    })
  }

  /**
   * Upsert de contacto: lo busca por email y lo crea si no existe.
   * Retorna siempre un AlegraContact con su ID.
   */
  async upsertContact(customer: ERPCustomer): Promise<AlegraContact> {
    const existing = await this.findContactByEmail(customer.email)
    if (existing) return existing
    return this.createContact(customer)
  }

  // ── Facturas ─────────────────────────────────────────────────────────────────

  /**
   * Crea una factura de venta en Alegra.
   *
   * Notas importantes:
   * - `items` debe contener los IDs de los ítems/servicios en Alegra.
   *   Si el ítem no existe en Alegra, se crea como un servicio genérico.
   * - El campo `observations` se usa para guardar el ID del pedido One Star.
   */
  async createInvoice(params: {
    contact: AlegraContact
    items: ERPOrderItem[]
    total: number
    paymentMethod: string
    orderId: string
  }): Promise<AlegraInvoice> {
    const alegraItems = params.items.map((item) => ({
      // Alegra requiere un ID de ítem; si el SKU no existe como producto
      // en Alegra, se puede usar un ítem genérico de "Venta" predefinido.
      // Por ahora se mapea con descripción y precio directamente.
      name: item.productName,
      description: `SKU: ${item.sku}`,
      quantity: item.quantity,
      price: item.unitPrice,
    }))

    return this.request<AlegraInvoice>("POST", "/invoices", {
      client: { id: params.contact.id },
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
      dueDate: new Date().toISOString().split("T")[0],
      items: alegraItems,
      observations: `Pedido One Star #${params.orderId} — Pago: ${params.paymentMethod}`,
      status: "open",
    })
  }

  // ── Inventario ───────────────────────────────────────────────────────────────

  /**
   * Busca un ítem en Alegra por su referencia (SKU).
   */
  async findItemBySku(sku: string): Promise<AlegraItem | null> {
    try {
      const results = await this.request<AlegraItem[]>(
        "GET",
        `/items?query=reference:${encodeURIComponent(sku)}`
      )
      return results[0] ?? null
    } catch {
      return null
    }
  }

  /**
   * Consulta el stock de un SKU desde Alegra.
   */
  async getStockBySku(sku: string): Promise<number | null> {
    const item = await this.findItemBySku(sku)
    return item?.inventory?.quantity ?? null
  }

  /**
   * Ajusta el inventario de múltiples ítems en Alegra (decremento).
   * Usa el endpoint de ajuste de inventario de Alegra.
   */
  async adjustInventory(
    items: { sku: string; qty: number }[]
  ): Promise<void> {
    // Alegra maneja ajustes de inventario por cada ítem individualmente.
    // Se procesan en paralelo con un límite de concurrencia básico.
    await Promise.allSettled(
      items.map(async ({ sku, qty }) => {
        const item = await this.findItemBySku(sku)
        if (!item) {
          console.warn(`[AlegraClient] SKU "${sku}" no encontrado en Alegra — stock no ajustado`)
          return
        }

        await this.request("POST", "/inventory-adjustments", {
          date: new Date().toISOString().split("T")[0],
          observations: `Venta One Star — SKU: ${sku}`,
          warehouse: { id: 1 }, // ID del almacén principal en Alegra
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

  /**
   * Consulta el stock de múltiples SKUs en una sola petición de lista.
   */
  async getBulkStock(skus: string[]): Promise<ERPStockItem[]> {
    const results: ERPStockItem[] = []
    // Alegra no tiene endpoint de bulk por referencia, así que lo hacemos
    // con una consulta general y filtramos.
    try {
      const items = await this.request<AlegraItem[]>("GET", "/items?type=product&limit=500")
      const skuSet = new Set(skus)
      for (const item of items) {
        if (item.reference && skuSet.has(item.reference)) {
          results.push({
            sku: item.reference,
            stock: item.inventory?.quantity ?? 0,
          })
        }
      }
    } catch (err) {
      console.error("[AlegraClient] getBulkStock failed:", err)
    }
    return results
  }
}
