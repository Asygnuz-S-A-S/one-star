/**
 * Cliente HTTP para la API REST de Loggro Pymes.
 *
 * Documentación oficial: https://developer.loggro.com/
 *
 * Autenticación:
 *   Authorization: Bearer <TOKEN>
 *   Content-Type: application/json   (requerido incluso en algunos GET)
 *
 * Servicio de inventario Pymes:
 *   Base: /apik/loggro-inventario/v1
 *   - GET  /items                                        → catálogo (SIN stock)
 *   - GET  /items/{codigo|uuid}                          → detalle de un ítem
 *   - GET  /productos/unidades-medida                    → unidades de medida
 *   - GET  /estructura-empresarial/establecimientos      → sedes
 *   - GET  /estructura-empresarial/bodegas               → bodegas
 *   - POST /productos/disponibilidad-productos           → EXISTENCIAS (stock)
 */

import type { ERPCustomer, ERPOrderItem, ERPStockItem } from "../erp.types"

// Base URL oficial para el API Pymes de Loggro
const LOGGRO_BASE_URL = (process.env.LOGGRO_BASE_URL || "https://api.loggro.com").replace(/\/$/, "")

// Prefijo del servicio de inventario Pymes
const INV = "/apik/loggro-inventario/v1"

// Ubicación de inventario. Si no se configuran por env, se auto-detectan
// (se elige el establecimiento tipo "EST" y su bodega hija).
const ENV_ESTABLECIMIENTO_UUID = process.env.LOGGRO_ESTABLECIMIENTO_UUID?.trim() || undefined
const ENV_BODEGA_UUID = process.env.LOGGRO_BODEGA_UUID?.trim() || undefined

// La consulta de disponibilidad falla el lote completo si UN código no existe;
// por eso se consulta en tandas y se reintenta descartando los no encontrados.
const DISPONIBILIDAD_CHUNK_SIZE = 100

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
  uuid?: string
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
  productoBase_uuid?: string
}

/** Nodo de la estructura empresarial (establecimiento) */
interface LoggroEstablecimiento {
  uuid: string
  codigo?: string
  nombre?: string
  /** "EST" = establecimiento operativo, "EPP" = establecimiento persona/principal */
  tipoNodo?: string
}

/** Nodo bodega. `padre` apunta al uuid del establecimiento dueño. */
interface LoggroBodega {
  uuid: string
  nombre?: string
  padre?: string
}

/** Ítem de la respuesta de disponibilidad de productos */
interface LoggroDisponibilidadItem {
  uuid?: string
  codigo?: string
  descripcion?: string
  cantidadDisponible?: number
}

/** Ubicación de inventario resuelta (establecimiento + bodega) */
interface InventoryLocation {
  establecimientoUuid: string
  /** Nombre del establecimiento (requerido por el endpoint de salidas). */
  establecimientoNombre: string
  bodegaUuid: string
}

/** Respuesta paginada del endpoint de items */
interface LoggroCatalogResponse {
  contenido?: { content?: LoggroCatalogItem[] }
}

/** Respuesta con envoltura `contenido` (lista) usada por varios endpoints */
interface LoggroContenidoResponse<T> {
  contenido?: T[]
}

interface LoggroErrorBody {
  errores?: { codigo?: string; mensaje?: string }[]
}

/** Resultado crudo de una petición sin lanzar excepción */
interface RawResponse {
  ok: boolean
  status: number
  text: string
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

export class LoggroClient {
  private token: string
  /** Cache de la ubicación de inventario resuelta (se resuelve una sola vez). */
  private locationPromise: Promise<InventoryLocation> | null = null

  constructor(token: string) {
    this.token = token
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    }
  }

  /** Petición que lanza si la respuesta no es 2xx. */
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${LOGGRO_BASE_URL}${path}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`[LoggroClient] ${method} ${path} → ${res.status}: ${text}`)
    }

    return res.json() as Promise<T>
  }

  /** Petición cruda que NO lanza: devuelve status + cuerpo para manejo fino. */
  private async requestSafe(method: string, path: string, body?: unknown): Promise<RawResponse> {
    try {
      const res = await fetch(`${LOGGRO_BASE_URL}${path}`, {
        method,
        headers: this.headers(),
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      })
      return { ok: res.ok, status: res.status, text: await res.text() }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, status: 0, text: message }
    }
  }

  // ── Healthcheck ──────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    const res = await this.requestSafe("GET", `${INV}/estructura-empresarial/establecimientos`)
    return res.ok
  }

  // ── Estructura empresarial (establecimientos y bodegas) ──────────────────────

  async getEstablecimientos(): Promise<LoggroEstablecimiento[]> {
    try {
      const data = await this.request<LoggroContenidoResponse<LoggroEstablecimiento>>(
        "GET",
        `${INV}/estructura-empresarial/establecimientos`
      )
      return data?.contenido ?? []
    } catch (err) {
      console.error("[LoggroClient] Error al listar establecimientos:", err)
      return []
    }
  }

  async getBodegas(): Promise<LoggroBodega[]> {
    try {
      const data = await this.request<LoggroContenidoResponse<LoggroBodega>>(
        "GET",
        `${INV}/estructura-empresarial/bodegas`
      )
      return data?.contenido ?? []
    } catch (err) {
      console.error("[LoggroClient] Error al listar bodegas:", err)
      return []
    }
  }

  /**
   * Resuelve el establecimiento + bodega a usar para consultar existencias.
   *
   * Prioridad:
   *   1. Variables de entorno LOGGRO_ESTABLECIMIENTO_UUID / LOGGRO_BODEGA_UUID.
   *   2. Auto-detección: primer establecimiento tipo "EST" y su bodega hija.
   *
   * El resultado se cachea: la topología de sedes cambia rara vez.
   */
  private resolveLocation(): Promise<InventoryLocation> {
    if (this.locationPromise) return this.locationPromise

    this.locationPromise = (async () => {
      // Siempre listamos la estructura empresarial: además del uuid necesitamos
      // el NOMBRE del establecimiento (requerido por el endpoint de salidas).
      const [establecimientos, bodegas] = await Promise.all([
        this.getEstablecimientos(),
        this.getBodegas(),
      ])

      const establecimiento =
        (ENV_ESTABLECIMIENTO_UUID && establecimientos.find((e) => e.uuid === ENV_ESTABLECIMIENTO_UUID)) ||
        establecimientos.find((e) => e.tipoNodo === "EST") ||
        establecimientos[0]

      // Fallback: si no pudimos listar pero hay uuid en env, seguimos con ese.
      const establecimientoUuid = establecimiento?.uuid ?? ENV_ESTABLECIMIENTO_UUID
      if (!establecimientoUuid) {
        throw new Error(
          "[LoggroClient] No se encontró ningún establecimiento. " +
            "Configura LOGGRO_ESTABLECIMIENTO_UUID y LOGGRO_BODEGA_UUID."
        )
      }

      const bodega =
        (ENV_BODEGA_UUID && bodegas.find((b) => b.uuid === ENV_BODEGA_UUID)) ||
        bodegas.find((b) => b.padre === establecimientoUuid) ||
        bodegas[0]

      const bodegaUuid = bodega?.uuid ?? ENV_BODEGA_UUID
      if (!bodegaUuid) {
        throw new Error(
          `[LoggroClient] El establecimiento "${establecimiento?.nombre ?? establecimientoUuid}" ` +
            "no tiene una bodega asociada. Configúrala en Loggro o define LOGGRO_BODEGA_UUID."
        )
      }

      const establecimientoNombre = establecimiento?.nombre ?? ""
      console.info(
        `[LoggroClient] Inventario en establecimiento "${establecimientoNombre || establecimientoUuid}" ` +
          `/ bodega "${bodega?.nombre ?? bodegaUuid}"`
      )
      return { establecimientoUuid, establecimientoNombre, bodegaUuid }
    })().catch((err) => {
      // No cachear el fallo: permitir reintento en la siguiente llamada.
      this.locationPromise = null
      throw err
    })

    return this.locationPromise
  }

  // ── Contactos (clientes) ─────────────────────────────────────────────────────
  // NOTA: los endpoints de clientes/facturas de abajo pertenecen al flujo de
  // ventas (Web → Loggro) y aún NO están mapeados a rutas reales de Loggro.

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

  // ── Inventario / Existencias ─────────────────────────────────────────────────

  async getUnidadesMedida(): Promise<LoggroUnidadMedida[]> {
    try {
      const results = await this.request<LoggroContenidoResponse<LoggroUnidadMedida> | LoggroUnidadMedida[]>(
        "GET",
        `${INV}/productos/unidades-medida`
      )
      if (Array.isArray(results)) return results
      return results?.contenido ?? []
    } catch (err) {
      console.error("[LoggroClient] Error al obtener unidades de medida:", err)
      return []
    }
  }

  async getProducts(): Promise<LoggroCatalogItem[]> {
    try {
      const results = await this.request<LoggroCatalogResponse>("GET", `${INV}/items`)
      return results?.contenido?.content || []
    } catch (err) {
      console.error("[LoggroClient] Error al obtener productos:", err)
      return []
    }
  }

  /**
   * Consulta las existencias (cantidad disponible) de una lista de códigos de ítem.
   *
   * Devuelve un mapa `codigo → cantidadDisponible`. Los códigos que Loggro no
   * reconoce como ítems inventariables (p. ej. productos base sin talla) se
   * omiten del mapa en lugar de hacer fallar todo el lote.
   */
  async getDisponibilidad(codigos: string[]): Promise<Map<string, number>> {
    const stock = new Map<string, number>()
    const unique = [...new Set(codigos.filter(Boolean))]
    if (unique.length === 0) return stock

    let location: InventoryLocation
    try {
      location = await this.resolveLocation()
    } catch (err) {
      console.error("[LoggroClient] No se pudo resolver la ubicación de inventario:", err)
      return stock
    }

    for (let i = 0; i < unique.length; i += DISPONIBILIDAD_CHUNK_SIZE) {
      const chunk = unique.slice(i, i + DISPONIBILIDAD_CHUNK_SIZE)
      await this.fetchDisponibilidadChunk(location, chunk, stock)
    }

    return stock
  }

  /**
   * Consulta un lote; si Loggro responde "Producto no encontrado: X", descarta
   * X y reintenta con el resto. Acota los reintentos al tamaño del lote.
   */
  private async fetchDisponibilidadChunk(
    location: InventoryLocation,
    chunk: string[],
    out: Map<string, number>
  ): Promise<void> {
    let pending = [...chunk]

    for (let attempt = 0; attempt <= chunk.length && pending.length > 0; attempt++) {
      const res = await this.requestSafe("POST", `${INV}/productos/disponibilidad-productos`, {
        establecimientoUuid: location.establecimientoUuid,
        bodegaUuid: location.bodegaUuid,
        items: pending.map((codigoItem) => ({ codigoItem })),
      })

      if (res.ok) {
        const data = this.parseJson<LoggroContenidoResponse<LoggroDisponibilidadItem>>(res.text)
        for (const item of data?.contenido ?? []) {
          if (item.codigo != null) out.set(String(item.codigo), Number(item.cantidadDisponible ?? 0))
        }
        return
      }

      // 400 con un código no encontrado → quitarlo y reintentar el resto.
      const missing = this.extractMissingCodigo(res.text)
      if (res.status === 400 && missing) {
        pending = pending.filter((c) => c !== missing)
        continue
      }

      console.error(
        `[LoggroClient] disponibilidad-productos → ${res.status}: ${res.text.slice(0, 200)}`
      )
      return
    }
  }

  /** Extrae el código del mensaje "Producto no encontrado: XYZ". */
  private extractMissingCodigo(text: string): string | null {
    const body = this.parseJson<LoggroErrorBody>(text)
    for (const e of body?.errores ?? []) {
      const match = /Producto no encontrado:\s*(.+)$/i.exec(e?.codigo ?? e?.mensaje ?? "")
      if (match) return match[1].trim()
    }
    return null
  }

  private parseJson<T>(text: string): T | null {
    try {
      return JSON.parse(text) as T
    } catch {
      return null
    }
  }

  async getStockBySku(sku: string): Promise<number | null> {
    const stock = await this.getDisponibilidad([sku])
    return stock.get(sku) ?? null
  }

  async getBulkStock(skus: string[]): Promise<ERPStockItem[]> {
    const stock = await this.getDisponibilidad(skus)
    return [...stock.entries()].map(([sku, s]) => ({ sku, stock: s }))
  }

  /**
   * Descuenta inventario tras una venta registrando una SALIDA de inventario.
   * `sku` corresponde al `codigoItem` de Loggro; `qty` es la cantidad a egresar.
   *
   * Devuelve el UUID de la salida creada, o `null` si no había ítems.
   */
  async createSalida(items: { sku: string; qty: number }[]): Promise<string | null> {
    const detalles = items
      .filter((i) => i.sku && i.qty > 0)
      .map((i) => ({ codigoItem: i.sku, cantidad: i.qty }))

    if (detalles.length === 0) return null

    const location = await this.resolveLocation()

    const res = await this.requestSafe("POST", `${INV}/salidas`, {
      establecimiento: location.establecimientoNombre,
      establecimientoUuid: location.establecimientoUuid,
      observacion: "Salida por venta One Star (e-commerce)",
      detallesSalida: detalles,
    })

    if (!res.ok) {
      throw new Error(`[LoggroClient] POST /salidas → ${res.status}: ${res.text.slice(0, 300)}`)
    }

    const data = this.parseJson<{ datos?: string }>(res.text)
    return data?.datos ?? null
  }

  /** Alias semántico: ajustar inventario = registrar una salida por la venta. */
  async adjustInventory(items: { sku: string; qty: number }[]): Promise<void> {
    await this.createSalida(items)
  }
}
