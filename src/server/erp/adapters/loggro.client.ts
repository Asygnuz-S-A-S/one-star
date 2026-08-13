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

import type {
  ERPCustomer,
  ERPEndpointDiagnostic,
  ERPOrderItem,
  ERPStockItem,
} from "../erp.types"
import type { LoggroStockSnapshot } from "./loggro-catalog.normalizer"
import { sanitizeErpError } from "../erp-error"

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
/** Evita serializar decenas de lotes sin saturar la API de Loggro. */
const DISPONIBILIDAD_CONCURRENCY = 4
/** Presupuesto total de una descarga de stock completa. */
const DISPONIBILIDAD_SNAPSHOT_TIMEOUT_MS = 60_000
/** Evita una tormenta de reintentos cuando un lote contiene muchos códigos inválidos. */
const MAX_MISSING_DISCARDS_PER_CHUNK = 10

// Paginación del catálogo. Loggro devuelve solo 10 ítems si no se pide `tamano`
// y rechaza (400) cualquier página mayor a 100, así que se recorre de a 100.
const CATALOG_PAGE_SIZE = 100
/** Tope de seguridad para no iterar sin fin si el ERP nunca marca `last`. */
const MAX_CATALOG_PAGES = 100
/** Evita que una llamada individual deje la sincronización colgada indefinidamente. */
const REQUEST_TIMEOUT_MS = 30_000
/** Presupuesto total del diagnóstico para funcionar en runtimes serverless. */
const DIAGNOSTIC_TIMEOUT_MS = 15_000
const DIAGNOSTIC_MAX_CATALOG_PAGES = 5
const DIAGNOSTIC_SAMPLE_SIZE = 5
const DIAGNOSTIC_MAX_LOCATIONS = 10

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
  codigo?: string | number
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
  cantidadDisponible?: number | string
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
  failure?: "timeout" | "network"
}

function stockWarehouseForEstablishment(
  warehouses: LoggroBodega[],
  establishmentUuid: string
): LoggroBodega | undefined {
  const normalizedName = (warehouse: LoggroBodega): string =>
    warehouse.nombre
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase() ?? ""
  const publishable = warehouses
    .filter((warehouse) => warehouse.padre === establishmentUuid)
    .filter((warehouse) => !normalizedName(warehouse).includes("SEPARADOS"))
    .sort((left, right) =>
      (left.nombre ?? left.uuid).localeCompare(right.nombre ?? right.uuid, "es")
    )

  return publishable.find((warehouse) =>
    normalizedName(warehouse).includes("BODEGA PUNTO DE VENTA")
  ) ?? publishable[0]
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  operation: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await operation(items[index])
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(1, concurrency), items.length) },
      () => worker()
    )
  )
  return results
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
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    timeoutMs = REQUEST_TIMEOUT_MS
  ): Promise<T> {
    const res = await fetch(`${LOGGRO_BASE_URL}${path}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(Math.max(1, Math.min(REQUEST_TIMEOUT_MS, timeoutMs))),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`[LoggroClient] ${method} ${path} → ${res.status}: ${text}`)
    }

    return res.json() as Promise<T>
  }

  /** Petición cruda que NO lanza: devuelve status + cuerpo para manejo fino. */
  private async requestSafe(
    method: string,
    path: string,
    body?: unknown,
    timeoutMs = REQUEST_TIMEOUT_MS
  ): Promise<RawResponse> {
    try {
      const res = await fetch(`${LOGGRO_BASE_URL}${path}`, {
        method,
        headers: this.headers(),
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(Math.max(1, Math.min(REQUEST_TIMEOUT_MS, timeoutMs))),
      })
      return { ok: res.ok, status: res.status, text: await res.text() }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const name = err && typeof err === "object" && "name" in err ? String(err.name) : ""
      const failure = name === "TimeoutError" || name === "AbortError" ? "timeout" : "network"
      return { ok: false, status: 0, text: message, failure }
    }
  }

  /** Extrae únicamente mensajes estructurados conocidos; nunca devuelve el cuerpo crudo. */
  private safeErrorDetail(text: string): string {
    const body = this.parseJson<LoggroErrorBody>(text)
    const errors = Array.isArray(body?.errores) ? body.errores : []
    const details = errors
      .map((error) => {
        if (!error || typeof error !== "object") return null
        const message = typeof error.mensaje === "string" ? error.mensaje : null
        const code = typeof error.codigo === "string" ? error.codigo : null
        return message ?? code
      })
      .filter((value): value is string => Boolean(value))
      .filter((value) => /^Producto no encontrado:\s*[A-Za-z0-9._-]{1,100}$/i.test(value))
    return details.length > 0
      ? sanitizeErpError(details.join(" · "))
      : "El proveedor no entregó un detalle seguro."
  }

  // ── Healthcheck ──────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    const res = await this.requestSafe("GET", `${INV}/estructura-empresarial/establecimientos`)
    return res.ok
  }

  /**
   * Probes acotados y bajo demanda. Solo usa endpoints de lectura; el POST de
   * disponibilidad es una consulta y nunca crea movimientos de inventario.
   */
  async diagnoseEndpoints(): Promise<ERPEndpointDiagnostic[]> {
    const results: ERPEndpointDiagnostic[] = []
    const deadline = Date.now() + DIAGNOSTIC_TIMEOUT_MS
    const remainingMs = () => Math.max(1, Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now()))
    const budgetExhausted = () => Date.now() >= deadline
    const withinRemainingBudget = <T>(promise: Promise<T>): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Se agotó el tiempo del diagnóstico.")),
          remainingMs()
        )
        promise.then(
          (value) => {
            clearTimeout(timer)
            resolve(value)
          },
          (error) => {
            clearTimeout(timer)
            reject(error)
          }
        )
      })

    const connectionStartedAt = Date.now()
    const connection = await this.requestSafe(
      "GET",
      `${INV}/estructura-empresarial/establecimientos`,
      undefined,
      remainingMs()
    )
    const connectionBody = this.parseJson<LoggroContenidoResponse<LoggroEstablecimiento>>(
      connection.text
    )
    const establishments = Array.isArray(connectionBody?.contenido)
      ? connectionBody.contenido
      : []
    const connectionBodyValid = Array.isArray(connectionBody?.contenido)
    results.push({
      endpoint: "connection",
      status: connection.ok ? (connectionBodyValid ? "healthy" : "warning") : "error",
      httpStatus: connection.status || null,
      latencyMs: Date.now() - connectionStartedAt,
      detail: connection.ok
        ? connectionBodyValid
          ? `La API respondió y devolvió ${establishments.length} establecimiento(s).`
          : "La API respondió, pero el formato de establecimientos no fue válido."
        : connection.status
          ? `El endpoint de conexión respondió HTTP ${connection.status}.`
          : "No fue posible alcanzar el endpoint de conexión.",
    })

    const catalogStartedAt = Date.now()
    const sampleCodeSet = new Set<string>()
    let catalogCount = 0
    let catalogHttpStatus: number | null = null
    let catalogRequestFailed = false
    let catalogFailure: RawResponse["failure"]
    let failedPageNumber: number | null = null
    let catalogMalformed = false
    let catalogItemIssues = 0
    let scannedPages = 0

    for (let pageNumber = 0; pageNumber < DIAGNOSTIC_MAX_CATALOG_PAGES; pageNumber++) {
      if (budgetExhausted()) break
      const catalog = await this.requestSafe(
        "GET",
        `${INV}/items?pagina=${pageNumber}&tamano=${CATALOG_PAGE_SIZE}`,
        undefined,
        remainingMs()
      )
      scannedPages += 1
      catalogHttpStatus = catalog.status || null
      if (!catalog.ok) {
        catalogRequestFailed = true
        catalogFailure = catalog.failure
        failedPageNumber = pageNumber
        break
      }

      const catalogBody = this.parseJson<LoggroCatalogResponse>(catalog.text)
      const page = catalogBody?.contenido ?? catalogBody?.datos
      if (!page || !Array.isArray(page.content)) {
        catalogMalformed = true
        break
      }

      const reportedCount = Number(page.totalElements ?? page.content.length)
      if (Number.isFinite(reportedCount) && reportedCount >= 0) {
        catalogCount = Math.max(catalogCount, reportedCount)
      } else {
        catalogItemIssues += 1
      }
      for (const item of page.content) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          catalogItemIssues += 1
          continue
        }
        if (item.definicion !== undefined && typeof item.definicion !== "boolean") {
          catalogItemIssues += 1
        }
        if (item.definicion === true) continue
        const rawCode = item.codigo
        const validCode =
          (typeof rawCode === "string" && rawCode.trim().length > 0) ||
          (typeof rawCode === "number" && Number.isFinite(rawCode))
        if (!validCode) {
          catalogItemIssues += 1
          continue
        }
        const code = String(rawCode).trim()
        if (code) sampleCodeSet.add(code)
        if (sampleCodeSet.size === DIAGNOSTIC_SAMPLE_SIZE) break
      }

      if (sampleCodeSet.size === DIAGNOSTIC_SAMPLE_SIZE) break
      const totalPages = Number(page.totalPages)
      const reachedReportedEnd =
        page.last === true ||
        (Number.isFinite(totalPages) && pageNumber + 1 >= totalPages) ||
        (Number.isFinite(page.totalElements) &&
          (pageNumber + 1) * CATALOG_PAGE_SIZE >= Number(page.totalElements))
      if (reachedReportedEnd) break
    }

    const sampleCodes = [...sampleCodeSet]
    const catalogNotExecuted = scannedPages === 0 && budgetExhausted()
    const catalogFunctionalIssue =
      catalogMalformed ||
      catalogRequestFailed ||
      catalogNotExecuted ||
      budgetExhausted() ||
      catalogCount === 0 ||
      catalogItemIssues > 0
    results.push({
      endpoint: "catalog",
      status: catalogNotExecuted || (catalogRequestFailed && scannedPages <= 1)
        ? "error"
        : catalogFunctionalIssue || sampleCodes.length === 0
          ? "warning"
          : "healthy",
      httpStatus: catalogHttpStatus,
      latencyMs: Date.now() - catalogStartedAt,
      detail: catalogNotExecuted
        ? "No se ejecutó el endpoint de catálogo porque se agotó el presupuesto del diagnóstico."
        : catalogRequestFailed
          ? catalogHttpStatus
            ? `La página ${(failedPageNumber ?? 0) + 1} del catálogo respondió HTTP ${catalogHttpStatus}; se conservaron ${sampleCodes.length} SKU previos.`
            : catalogFailure === "timeout"
              ? `La página ${(failedPageNumber ?? 0) + 1} del catálogo agotó el tiempo de espera; se conservaron ${sampleCodes.length} SKU previos.`
              : `No fue posible alcanzar la página ${(failedPageNumber ?? 0) + 1} del catálogo; se conservaron ${sampleCodes.length} SKU previos.`
        : budgetExhausted()
          ? `Se agotó el presupuesto del diagnóstico tras ${scannedPages} página(s); se conservaron ${sampleCodes.length} SKU previos.`
        : catalogMalformed
          ? "El catálogo respondió, pero su formato no fue válido."
          : catalogItemIssues > 0
            ? `El catálogo respondió con ${catalogItemIssues} inconsistencia(s); se conservaron ${sampleCodes.length} SKU válidos.`
          : catalogCount === 0
            ? "El catálogo respondió correctamente, pero no devolvió ítems."
            : `El catálogo reportó ${catalogCount} ítem(s); se tomaron ${sampleCodes.length} SKU vendibles en ${scannedPages} página(s).`,
    })

    const stockStartedAt = Date.now()
    if (sampleCodes.length === 0 || budgetExhausted()) {
      results.push({
        endpoint: "stock",
        status: "error",
        httpStatus: null,
        latencyMs: Date.now() - stockStartedAt,
        detail: "No se pudo seleccionar una muestra de SKU vendibles para probar disponibilidad.",
      })
      return results
    }

    let resolvedLocations: InventoryLocation[]
    try {
      resolvedLocations = await withinRemainingBudget(
        this.resolveStockLocations(remainingMs(), false)
      )
    } catch {
      resolvedLocations = []
    }
    const locationsTruncated = resolvedLocations.length > DIAGNOSTIC_MAX_LOCATIONS
    const scopedLocations = resolvedLocations.slice(0, DIAGNOSTIC_MAX_LOCATIONS)

    if (scopedLocations.length === 0 || budgetExhausted()) {
      results.push({
        endpoint: "stock",
        status: "error",
        httpStatus: null,
        latencyMs: Date.now() - stockStartedAt,
        detail: budgetExhausted()
          ? "Se agotó el tiempo del diagnóstico antes de probar disponibilidad."
          : "No se encontraron ubicaciones de inventario consultables.",
      })
      return results
    }

    const expectedCodes = new Set(sampleCodes)
    const locationResults = await Promise.all(scopedLocations.map(async (location) => {
      const response = await this.requestSafe(
        "POST",
        `${INV}/productos/disponibilidad-productos`,
        {
          establecimientoUuid: location.establecimientoUuid,
          bodegaUuid: location.bodegaUuid,
          items: sampleCodes.map((codigoItem) => ({ codigoItem })),
        },
        remainingMs()
      )
      if (!response.ok) {
        return { ok: false, status: response.status, totalStock: 0, issues: 0 }
      }

      const body = this.parseJson<LoggroContenidoResponse<LoggroDisponibilidadItem>>(response.text)
      if (!Array.isArray(body?.contenido)) {
        return { ok: true, status: response.status, totalStock: 0, issues: 1 }
      }

      const seen = new Set<string>()
      let issues = 0
      let totalStock = 0
      for (const row of body.contenido) {
        if (!row || typeof row !== "object" || Array.isArray(row)) {
          issues += 1
          continue
        }
        const code = row.codigo == null ? "" : String(row.codigo)
        if (!code || !expectedCodes.has(code) || seen.has(code)) {
          issues += 1
          continue
        }
        seen.add(code)
        const rawQuantity = row.cantidadDisponible
        const quantity = typeof rawQuantity === "number"
          ? rawQuantity
          : typeof rawQuantity === "string" && rawQuantity.trim()
            ? Number(rawQuantity)
            : Number.NaN
        if (!Number.isFinite(quantity) || quantity < 0) {
          issues += 1
          continue
        }
        totalStock += quantity
      }
      for (const code of expectedCodes) {
        if (!seen.has(code)) issues += 1
      }
      return { ok: true, status: response.status, totalStock, issues }
    }))

    const failedLocations = locationResults.filter((result) => !result.ok).length
    const allLocationsFailed = failedLocations === scopedLocations.length
    const validationIssues = locationResults.reduce((sum, result) => sum + result.issues, 0)
    const totalStock = locationResults.reduce((sum, result) => sum + result.totalStock, 0)
    const failedResult = locationResults.find((result) => !result.ok)
    const stockHttpStatus = failedResult
      ? failedResult.status || null
      : locationResults[0]?.status || null
    const truncatedLocations = Math.max(0, resolvedLocations.length - scopedLocations.length)
    const incomplete = failedLocations > 0 || validationIssues > 0 || locationsTruncated
    results.push({
      endpoint: "stock",
      status: allLocationsFailed ? "error" : incomplete || totalStock === 0 ? "warning" : "healthy",
      httpStatus: stockHttpStatus,
      latencyMs: Date.now() - stockStartedAt,
      detail: allLocationsFailed
        ? `El endpoint de disponibilidad falló en ${failedLocations} bodega(s).`
        : incomplete
          ? `La disponibilidad quedó parcial: ${failedLocations} sede(s) fallida(s), ${validationIssues} inconsistencia(s) y ${truncatedLocations} truncada(s) por límite.`
          : totalStock === 0
            ? `El endpoint respondió, pero la muestra de ${sampleCodes.length} SKU sumó stock total cero.`
            : `El endpoint respondió para ${sampleCodes.length} SKU con ${totalStock} unidad(es) disponibles.`,
    })

    return results
  }

  // ── Estructura empresarial (establecimientos y bodegas) ──────────────────────

  async getEstablecimientos(timeoutMs = REQUEST_TIMEOUT_MS): Promise<LoggroEstablecimiento[]> {
    try {
      const data = await this.request<LoggroContenidoResponse<LoggroEstablecimiento>>(
        "GET",
        `${INV}/estructura-empresarial/establecimientos`,
        undefined,
        timeoutMs
      )
      return data?.contenido ?? []
    } catch (err) {
      console.error("[LoggroClient] Error al listar establecimientos:", err)
      return []
    }
  }

  async getBodegas(timeoutMs = REQUEST_TIMEOUT_MS): Promise<LoggroBodega[]> {
    try {
      const data = await this.request<LoggroContenidoResponse<LoggroBodega>>(
        "GET",
        `${INV}/estructura-empresarial/bodegas`,
        undefined,
        timeoutMs
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
  private resolveLocation(
    timeoutMs = REQUEST_TIMEOUT_MS,
    useCache = true
  ): Promise<InventoryLocation> {
    if (useCache && this.locationPromise) return this.locationPromise

    const operation = (async () => {
      // Siempre listamos la estructura empresarial: además del uuid necesitamos
      // el NOMBRE del establecimiento (requerido por el endpoint de salidas).
      const [establecimientos, bodegas] = await Promise.all([
        this.getEstablecimientos(timeoutMs),
        this.getBodegas(timeoutMs),
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
        stockWarehouseForEstablishment(bodegas, establecimientoUuid)

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
      if (useCache) this.locationPromise = null
      throw err
    })

    if (useCache) this.locationPromise = operation
    return operation
  }

  /**
   * Ubicaciones cuyo inventario suma al stock publicado en la tienda.
   *
   * Con `LOGGRO_STOCK_SCOPE=all` (por defecto) se toman TODAS las tiendas
   * operativas (`tipoNodo === "EST"`) con bodega propia, de modo que la web
   * muestre la disponibilidad consolidada de la cadena. Con `primary` se limita
   * a la sede principal (la misma que registra las salidas por venta).
   */
  private resolveStockLocations(
    timeoutMs = REQUEST_TIMEOUT_MS,
    useCache = true
  ): Promise<InventoryLocation[]> {
    if (useCache && this.stockLocationsPromise) return this.stockLocationsPromise

    const operation = (async () => {
      const deadline = Date.now() + timeoutMs
      const remainingMs = () => Math.max(1, deadline - Date.now())
      if (STOCK_SCOPE === "primary") {
        return [await this.resolveLocation(remainingMs(), useCache)]
      }

      const [establecimientos, bodegas] = await Promise.all([
        this.getEstablecimientos(remainingMs()),
        this.getBodegas(remainingMs()),
      ])

      const tiendas = establecimientos.filter((e) => e.tipoNodo === "EST")
      const locations: InventoryLocation[] = []

      for (const est of tiendas) {
        const bodega = stockWarehouseForEstablishment(bodegas, est.uuid)
        if (!bodega) continue
        locations.push({
          establecimientoUuid: est.uuid,
          establecimientoNombre: est.nombre ?? "",
          bodegaUuid: bodega.uuid,
        })
      }

      // Sin tiendas utilizables, se cae a la ubicación principal.
      if (locations.length === 0) {
        // Si Loggro sí devolvió tiendas pero ninguna tiene una bodega publicable,
        // no caer en "Separados" ni en una bodega ajena por orden de respuesta.
        if (tiendas.length > 0) return []
        return [await this.resolveLocation(remainingMs(), useCache)]
      }

      console.info(
        `[LoggroClient] Stock consolidado de ${locations.length} tienda(s): ` +
          locations.map((l) => l.establecimientoNombre || l.establecimientoUuid).join(", ")
      )
      return locations
    })().catch((err) => {
      if (useCache) this.stockLocationsPromise = null
      throw err
    })

    if (useCache) this.stockLocationsPromise = operation
    return operation
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
    const deadline = Date.now() + DISPONIBILIDAD_SNAPSHOT_TIMEOUT_MS
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

    const tasks = locations.flatMap((location) => {
      const chunks: Array<{ location: InventoryLocation; codes: string[] }> = []
      for (let i = 0; i < unique.length; i += DISPONIBILIDAD_CHUNK_SIZE) {
        chunks.push({
          location,
          codes: unique.slice(i, i + DISPONIBILIDAD_CHUNK_SIZE),
        })
      }
      return chunks
    })

    const chunkResults = await mapWithConcurrency(
      tasks,
      DISPONIBILIDAD_CONCURRENCY,
      async ({ location, codes }) => {
        const chunkStock = new Map<string, number>()
        const result = await this.fetchDisponibilidadChunk(
          location,
          codes,
          chunkStock,
          deadline
        )
        return { ...result, stockByCodigo: chunkStock }
      }
    )

    const incompleteCodes = new Set<string>()
    const errors: string[] = []

    // El stock de cada tienda se ACUMULA sobre el mismo mapa: un SKU disponible
    // en varias sedes suma sus existencias. Cada tarea usa su propio mapa para
    // que la concurrencia no comparta estado mutable durante las peticiones.
    for (const result of chunkResults) {
      result.missingCodes.forEach((codigo) => incompleteCodes.add(codigo))
      errors.push(...result.errors)
      for (const [codigo, cantidad] of result.stockByCodigo) {
        stock.set(codigo, (stock.get(codigo) ?? 0) + cantidad)
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
    out: Map<string, number>,
    deadline: number
  ): Promise<{ missingCodes: string[]; errors: string[] }> {
    let pending = [...chunk]
    const missingCodes: string[] = []

    for (
      let attempt = 0;
      attempt <= MAX_MISSING_DISCARDS_PER_CHUNK && pending.length > 0;
      attempt++
    ) {
      const remainingMs = deadline - Date.now()
      if (remainingMs <= 0) {
        return {
          missingCodes: [...missingCodes, ...pending],
          errors: ["Se agotó el tiempo total para consultar la disponibilidad en Loggro."],
        }
      }

      const res = await this.requestSafe(
        "POST",
        `${INV}/productos/disponibilidad-productos`,
        {
          establecimientoUuid: location.establecimientoUuid,
          bodegaUuid: location.bodegaUuid,
          items: pending.map((codigoItem) => ({ codigoItem })),
        },
        remainingMs
      )

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

      const error = sanitizeErpError(
        `[LoggroClient] disponibilidad-productos → ${res.status}. ${this.safeErrorDetail(res.text)}`
      )
      console.error(error)
      return { missingCodes: [...missingCodes, ...pending], errors: [error] }
    }

    return {
      missingCodes: [...missingCodes, ...pending],
      errors: pending.length > 0
        ? [
            `Loggro superó el límite de ${MAX_MISSING_DISCARDS_PER_CHUNK} ` +
              "descartes de SKU inválidos para un lote.",
          ]
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
