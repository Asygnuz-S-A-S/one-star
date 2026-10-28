import "server-only"

export interface AddiRawPolicy {
  discount: number
  productType: string
  policyMaxAmount: number
  isVisible: boolean
}

export interface AddiRawConfigResponse {
  minAmount: number
  maxAmount: number
  policy?: AddiRawPolicy
  policies?: AddiRawPolicy[]
  widgetConfig?: {
    widgetVersion?: string
    widgetShowPreapproval?: boolean
  }
  checkoutConfig?: {
    version?: string
  }
  isActiveAlly: boolean
  isActivePayNow?: boolean
}

export interface AddiWidgetEvaluation {
  available: boolean
  allySlug: string
  requestedAmount: number
  minAmount: number
  maxAmount: number
  inRange: boolean
  outOfRangeNotice?: string
  widgetVersion?: string
  widgetShowPreapproval?: boolean
}

export function getAddiAllySlug(): string {
  return process.env.ADDI_ALLY_SLUG?.trim() || "onestar-ecommerce"
}

// Caché en memoria para evitar llamadas redundantes repetitivas (5 minutos)
const configCache = new Map<string, { data: AddiRawConfigResponse; expiresAt: number }>()

export function clearAddiConfigCacheForTesting(): void {
  configCache.clear()
}

export async function fetchAddiConfig(
  requestedAmount: number,
  allySlug: string = getAddiAllySlug()
): Promise<AddiRawConfigResponse | null> {
  const roundedAmount = Math.max(0, Math.round(requestedAmount))
  const cacheKey = `${allySlug}:${roundedAmount}`
  const now = Date.now()
  const cached = configCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  const endpoint = `https://channels-public-api.addi.com/allies/${encodeURIComponent(
    allySlug
  )}/config?requestedamount=${roundedAmount}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
      next: { revalidate: 300 },
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[addi-config] Error HTTP ${response.status} de la API de Addi`)
      return null
    }

    const data = (await response.json()) as AddiRawConfigResponse
    configCache.set(cacheKey, { data, expiresAt: now + 5 * 60 * 1000 })
    return data
  } catch (error) {
    console.warn("[addi-config] Fallo silencioso al consultar configuración de Addi:", error)
    return null
  }
}

export async function getAddiWidgetEvaluation(
  requestedAmount: number,
  overrideAllySlug?: string
): Promise<AddiWidgetEvaluation | null> {
  const allySlug = overrideAllySlug || getAddiAllySlug()
  const config = await fetchAddiConfig(requestedAmount, allySlug)

  if (!config) {
    return null
  }

  // Si isActiveAlly es false o policy.isVisible es false, no muestres el widget
  const isVisible = config.policy?.isVisible ?? true
  if (!config.isActiveAlly || !isVisible) {
    return {
      available: false,
      allySlug,
      requestedAmount,
      minAmount: config.minAmount,
      maxAmount: config.maxAmount,
      inRange: false,
    }
  }

  const inRange = requestedAmount >= config.minAmount && requestedAmount <= config.maxAmount

  const formatter = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  })

  let outOfRangeNotice: string | undefined
  if (!inRange) {
    outOfRangeNotice = `Addi aplica para compras entre ${formatter.format(
      config.minAmount
    )} y ${formatter.format(config.maxAmount)}`
  }

  return {
    available: true,
    allySlug,
    requestedAmount,
    minAmount: config.minAmount,
    maxAmount: config.maxAmount,
    inRange,
    outOfRangeNotice,
    widgetVersion: config.widgetConfig?.widgetVersion,
    widgetShowPreapproval: config.widgetConfig?.widgetShowPreapproval,
  }
}
