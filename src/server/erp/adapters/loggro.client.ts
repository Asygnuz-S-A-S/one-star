import "server-only"

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
import type { LoggroStockSnapshot } from "./loggro-catalog.normalizer"

// Base URL oficial para el API Pymes de Loggro
const LOGGRO_BASE_URL = (process.env.LOGGRO_BASE_URL || "https://api.loggro.com").replace(/\/$/, "")

// Prefijo del servicio de inventario Pymes
const INV = "/apik/loggro-inventario/v1"

// Ubicación de inventario. Si no se configuran por env, se auto-detectan
// (se elige el establecimiento tipo "EST" y su bodega hija).
const ENV_ESTABLECIMIENTO_UUID = process.env.LOGGRO_ESTABLECIMIENTO_UUID?.trim() || undefined
const ENV_BODEGA_UUID = process.env.LOGGRO_BODEGA_UUID?.trim() || undefined

// Alcance del stock publicado en la tienda:
//   "all"     → suma el inventario de todas las tiendas (por defecto)
//   "primary" → solo la sede principal
const STOCK_SCOPE = (process.env.LOGGRO_STOCK_SCOPE ?? "all").toLowerCase().trim()

// La consulta de disponibilidad falla el lote completo si UN código no existe;
// por eso se consulta en tandas y se reintenta descartando los no encontrados.
const DISPONIBILIDAD_CHUNK_SIZE = 100

// Paginación del catálogo. Loggro devuelve solo 10 ítems si no se pide `tamano`
// y rechaza (400) cualquier página mayor a 100, así que se recorre de a 100.
const CATALOG_PAGE_SIZE = 100
/** Tope de seguridad para no iterar sin fin si el ERP nunca marca `last`. */
const MAX_CATALOG_PAGES = 100
/** Evita que una llamada individual deje la sincronización colgada indefinidamente. */
const REQUEST_TIMEOUT_MS = 30_000

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
  /** Descripción larga; suele incluir talla y color (ej. "... 39 Azul Unisex"). */
  descripcionDetallada?: string
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
  /** `true` identifica el producto padre de Loggro; no es una variante vendible. */
  definicion?: boolean
  /** UUID de la definición padre a la que pertenece una variante vendible. */
  definidoEn_uuid?: string
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

/** Página del listado de ítems (formato Spring Data). */
interface LoggroCatalogPage {
  content?: LoggroCatalogItem[]
  totalElements?: number
  totalPages?: number
  last?: boolean
}

/**
 * Respuesta paginada del endpoint de items.
 * La API real envuelve en `contenido`; la documentación usa `datos`.
 * Se aceptan ambas para no depender de cuál esté vigente.
 */
interface LoggroCatalogResponse {
  contenido?: LoggroCatalogPage
  datos?: LoggroCatalogPage
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
  /** Cache de las ubicaciones que suman al stock publicado. */
  private stockLocationsPromise: Promise<InventoryLocation[]> | null = null

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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

  /**
   * Ubicaciones cuyo inventario suma al stock publicado en la tienda.
   *
   * Con `LOGGRO_STOCK_SCOPE=all` (por defecto) se toman TODAS las tiendas
   * operativas (`tipoNodo === "EST"`) con bodega propia, de modo que la web
   * muestre la disponibilidad consolidada de la cadena. Con `primary` se limita
   * a la sede principal (la misma que registra las salidas por venta).
   */
  private resolveStockLocations(): Promise<InventoryLocation[]> {
    if (this.stockLocationsPromise) return this.stockLocationsPromise

    this.stockLocationsPromise = (async () => {
      if (STOCK_SCOPE === "primary") return [await this.resolveLocation()]

      const [establecimientos, bodegas] = await Promise.all([
        this.getEstablecimientos(),
        this.getBodegas(),
      ])

      const tiendas = establecimientos.filter((e) => e.tipoNodo === "EST")
      const locations: InventoryLocation[] = []

      for (const est of tiendas) {
        const bodega = bodegas.find((b) => b.padre === est.uuid)
        if (!bodega) continue
        locations.push({
          establecimientoUuid: est.uuid,
          establecimientoNombre: est.nombre ?? "",
          bodegaUuid: bodega.uuid,
        })
      }

      // Sin tiendas utilizables, se cae a la ubicación principal.
      if (locations.length === 0) return [await this.resolveLocation()]

      console.info(
        `[LoggroClient] Stock consolidado de ${locations.length} tienda(s): ` +
          locations.map((l) => l.establecimientoNombre || l.establecimientoUuid).join(", ")
      )
      return locations
    })().catch((err) => {
      this.stockLocationsPromise = null
      throw err
    })

    return this.stockLocationsPromise
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

  /**
   * Descarga el catálogo completo recorriendo todas las páginas.
   *
   * Loggro pagina con `pagina`/`tamano` (por defecto solo 10 registros), así que
   * pedir el listado sin parámetros deja fuera casi todo el catálogo.
   *
   * Los errores se PROPAGAN a propósito: un fallo del ERP no debe confundirse
   * con "el catálogo está vacío", porque eso ocultaría la avería.
   */
  async getProducts(): Promise<LoggroCatalogItem[]> {
    const items: LoggroCatalogItem[] = []

    for (let pagina = 0; pagina < MAX_CATALOG_PAGES; pagina++) {
      const res = await this.request<LoggroCatalogResponse>(
        "GET",
        `${INV}/items?pagina=${pagina}&tamano=${CATALOG_PAGE_SIZE}`
      )
      const page = res?.contenido ?? res?.datos
      const content = page?.content ?? []
      items.push(...content)

      const isLast = page?.last === true || content.length < CATALOG_PAGE_SIZE
      if (isLast) return items
    }

    console.warn(
      `[LoggroClient] Se alcanzó el tope de ${MAX_CATALOG_PAGES} páginas ` +
        `(${items.length} ítems); el catálogo podría estar incompleto.`
    )
    return items
  }

  /**
   * Consulta las existencias (cantidad disponible) de una lista de códigos de ítem.
   *
   * Devuelve un mapa `codigo → cantidadDisponible`. Los códigos que Loggro no
   * reconoce como ítems inventariables (p. ej. productos base sin talla) se
   * omiten del mapa en lugar de hacer fallar todo el lote.
   */
  async getDisponibilidad(codigos: string[]): Promise<Map<string, number>> {
    const snapshot = await this.getDisponibilidadSnapshot(codigos)
    return snapshot.stockByCodigo
  }

  /**
   * Variante diagnóstica de `getDisponibilidad`: además del mapa de stock,
   * informa si todas las bodegas respondieron para todos los SKU solicitados.
   */
  async getDisponibilidadSnapshot(codigos: string[]): Promise<LoggroStockSnapshot> {
    const stock = new Map<string, number>()
    const unique = [...new Set(codigos.filter(Boolean))]
    if (unique.length === 0) {
      return {
        stockByCodigo: stock,
        complete: true,
        requestedCount: 0,
        resolvedCount: 0,
        missingCodes: [],
        errors: [],
      }
    }

    let locations: InventoryLocation[]
    try {
      locations = await this.resolveStockLocations()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[LoggroClient] No se pudo resolver la ubicación de inventario:", message)
      return {
        stockByCodigo: stock,
        complete: false,
        requestedCount: unique.length,
        resolvedCount: 0,
        missingCodes: unique,
        errors: [message],
      }
    }

    if (locations.length === 0) {
      return {
        stockByCodigo: stock,
        complete: false,
        requestedCount: unique.length,
        resolvedCount: 0,
        missingCodes: unique,
        errors: ["Loggro no devolvió bodegas consultables para obtener el stock."],
      }
    }

    const incompleteCodes = new Set<string>()
    const errors: string[] = []

    // El stock de cada tienda se ACUMULA sobre el mismo mapa: un SKU disponible
    // en varias sedes suma sus existencias.
    for (const location of locations) {
      for (let i = 0; i < unique.length; i += DISPONIBILIDAD_CHUNK_SIZE) {
        const chunk = unique.slice(i, i + DISPONIBILIDAD_CHUNK_SIZE)
        const result = await this.fetchDisponibilidadChunk(location, chunk, stock)
        result.missingCodes.forEach((codigo) => incompleteCodes.add(codigo))
        errors.push(...result.errors)
      }
    }

    const missingCodes = [...incompleteCodes]
    return {
      stockByCodigo: stock,
      complete: missingCodes.length === 0 && errors.length === 0,
      requestedCount: unique.length,
      resolvedCount: unique.length - missingCodes.length,
      missingCodes,
      errors,
    }
  }

  /**
   * Consulta un lote; si Loggro responde "Producto no encontrado: X", descarta
   * X y reintenta con el resto. Acota los reintentos al tamaño del lote.
   */
  private async fetchDisponibilidadChunk(
    location: InventoryLocation,
    chunk: string[],
    out: Map<string, number>
  ): Promise<{ missingCodes: string[]; errors: string[] }> {
    let pending = [...chunk]
    const missingCodes: string[] = []

    for (let attempt = 0; attempt <= chunk.length && pending.length > 0; attempt++) {
      const res = await this.requestSafe("POST", `${INV}/productos/disponibilidad-productos`, {
        establecimientoUuid: location.establecimientoUuid,
        bodegaUuid: location.bodegaUuid,
        items: pending.map((codigoItem) => ({ codigoItem })),
      })

      if (res.ok) {
        const data = this.parseJson<LoggroContenidoResponse<LoggroDisponibilidadItem>>(res.text)
        const rows = data?.contenido ?? []
        const returnedCodes = new Set<string>()
        for (const item of rows) {
          if (item.codigo == null) continue
          const codigo = String(item.codigo)
          returnedCodes.add(codigo)
          const cantidad = Number(item.cantidadDisponible ?? 0)
          out.set(codigo, (out.get(codigo) ?? 0) + cantidad)
        }
        const omittedCodes = pending.filter((codigo) => !returnedCodes.has(codigo))
        return {
          missingCodes: [...missingCodes, ...omittedCodes],
          errors: omittedCodes.length > 0
            ? [`Loggro omitió ${omittedCodes.length} SKU(s) en la respuesta de disponibilidad.`]
            : [],
        }
      }

      // 400 con un código no encontrado → quitarlo y reintentar el resto.
      const missing = this.extractMissingCodigo(res.text)
      if (res.status === 400 && missing) {
        missingCodes.push(missing)
        pending = pending.filter((c) => c !== missing)
        continue
      }

      const error = `[LoggroClient] disponibilidad-productos → ${res.status}: ${res.text.slice(0, 200)}`
      console.error(error)
      return { missingCodes: [...missingCodes, ...pending], errors: [error] }
    }

    return {
      missingCodes: [...missingCodes, ...pending],
      errors: pending.length > 0
        ? ["Loggro agotó los reintentos de disponibilidad para un lote."]
        : [],
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
