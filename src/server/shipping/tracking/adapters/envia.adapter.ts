import "server-only"

import type { IShippingTrackingPort, TrackingEvent } from "../ports/shipping-tracking.port"

interface CacheEntry {
  data: TrackingEvent | null
  expiresAt: number
}

const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutos
const REQUEST_TIMEOUT_MS = 5000 // 5 segundos

export class EnviaShippingTrackingAdapter implements IShippingTrackingPort {
  private cache = new Map<string, CacheEntry>()
  private apiUrl?: string
  private apiToken?: string
  private urlTemplate?: string

  constructor(options?: {
    apiUrl?: string
    apiToken?: string
    urlTemplate?: string
  }) {
    this.apiUrl = options?.apiUrl ?? process.env.ENVIA_API_URL
    this.apiToken = options?.apiToken ?? process.env.ENVIA_API_TOKEN
    this.urlTemplate =
      options?.urlTemplate ??
      process.env.ENVIA_TRACKING_URL_TEMPLATE ??
      "https://envia.co/rastreo?guia={guia}"
  }

  buildTrackingUrl(guia: string): string | null {
    if (!guia) return null
    const template = this.urlTemplate || "https://envia.co/rastreo?guia={guia}"
    return template.replace("{guia}", encodeURIComponent(guia.trim()))
  }

  async getTracking(guia: string): Promise<TrackingEvent | null> {
    const trimmedGuia = guia?.trim()
    if (!trimmedGuia) return null

    // 1. Revisar caché en memoria
    const now = Date.now()
    const cached = this.cache.get(trimmedGuia)
    if (cached && cached.expiresAt > now) {
      return cached.data
    }

    // 2. Si faltan credenciales, retornar null (sin romper)
    if (!this.apiUrl || !this.apiToken) {
      return null
    }

    // 3. Consultar la API con timeout de 5 segundos
    try {
      const url = this.apiUrl.includes("{guia}")
        ? this.apiUrl.replace("{guia}", encodeURIComponent(trimmedGuia))
        : `${this.apiUrl.replace(/\/$/, "")}/${encodeURIComponent(trimmedGuia)}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId))

      if (!response.ok) {
        console.warn(`[EnviaTracking] Error respuesta transportadora (${response.status}) para guía ${trimmedGuia}`)
        return null
      }

      const raw = await response.json()
      const tracking = this.normalizeResponse(raw)

      // Guardar en caché 15 minutos
      this.cache.set(trimmedGuia, {
        data: tracking,
        expiresAt: now + CACHE_TTL_MS,
      })

      return tracking
    } catch (error) {
      console.warn(`[EnviaTracking] Error consultando seguimiento guía ${trimmedGuia}:`, error)
      return null
    }
  }

  /**
   * Normaliza la respuesta de Envía al modelo estándar TrackingEvent.
   * La estructura de respuesta real está sujeta a confirmación de documentación con Envía.
   */
  private normalizeResponse(raw: unknown): TrackingEvent | null {
    if (!raw || typeof raw !== "object") return null

    const obj = raw as Record<string, unknown>
    const data =
      typeof obj.data === "object" && obj.data !== null
        ? (obj.data as Record<string, unknown>)
        : undefined

    const state =
      obj.state ??
      obj.estado ??
      obj.status ??
      data?.state ??
      data?.estado
    const lastEvent =
      obj.lastEvent ??
      obj.ultimoEvento ??
      obj.evento ??
      data?.lastEvent ??
      data?.ultimoEvento
    const city =
      obj.city ??
      obj.ciudad ??
      data?.city ??
      data?.ciudad ??
      ""
    const at =
      obj.at ??
      obj.fecha ??
      data?.at ??
      data?.fecha ??
      new Date().toISOString()

    if (!state && !lastEvent) return null

    return {
      state: String(state || lastEvent),
      lastEvent: String(lastEvent || state),
      city: String(city),
      at: String(at),
    }
  }

  /** Limpia la caché (útil para tests) */
  clearCache(): void {
    this.cache.clear()
  }
}
