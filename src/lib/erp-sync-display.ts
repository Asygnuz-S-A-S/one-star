export interface ErpSyncCountLike {
  processedCount: number
  productCount?: number
  variantCount?: number
}

export interface ErpErrorPresentation {
  title: string
  explanation: string
  action: string
}

/** Traduce fallos técnicos conocidos a una explicación accionable para administración. */
export function getErpErrorPresentation(error: string | null | undefined): ErpErrorPresentation {
  if (!error) {
    return {
      title: "La sincronización falló",
      explanation: "El ERP no entregó un detalle adicional.",
      action: "Usa “Probar endpoints” para revisar conexión, catálogo e inventario por separado.",
    }
  }

  const normalized = error.toLocaleLowerCase("es")

  if (
    normalized.includes("stock total en cero") ||
    (normalized.includes("inventario") && normalized.includes("en cero"))
  ) {
    return {
      title: "El inventario del ERP llegó en cero",
      explanation:
        "La API puede estar respondiendo correctamente, pero el ERP informó cero unidades para todos los SKU consultados. La web conservó el inventario existente.",
      action:
        "Revisa las existencias y la asignación de bodegas en el ERP; después ejecuta “Probar endpoints” antes de volver a sincronizar.",
    }
  }

  if (normalized.includes("stock fue parcial") || normalized.includes("stock es desconocido")) {
    return {
      title: "La consulta de inventario quedó incompleta",
      explanation:
        "No fue posible obtener una respuesta válida para todos los SKU, por lo que la web evitó reemplazar existencias con datos parciales.",
      action: "Comprueba las bodegas, los SKU faltantes y el endpoint de disponibilidad del ERP.",
    }
  }

  if (normalized.includes("devolvió 0 productos") || normalized.includes("catálogo vacío")) {
    return {
      title: "El ERP no devolvió productos",
      explanation: "La conexión puede estar activa aunque el endpoint de catálogo no entregue registros.",
      action: "Verifica los permisos del token y que existan productos visibles para la integración.",
    }
  }

  if (normalized.includes("escrituras del catálogo están pausadas")) {
    return {
      title: "Las actualizaciones del catálogo están pausadas",
      explanation: "La lectura terminó, pero la protección de escrituras impidió aplicar cambios en la web.",
      action: "Mantén la protección activa hasta aprobar la calidad de los datos recibidos del ERP.",
    }
  }

  if (normalized.includes("ya hay una sincronización")) {
    return {
      title: "Ya hay una sincronización en curso",
      explanation: "Se evitó iniciar un segundo proceso mientras el anterior sigue trabajando.",
      action: "Espera a que termine y actualiza esta página antes de intentarlo nuevamente.",
    }
  }

  return {
    title: "La sincronización falló",
    explanation: error,
    action: "Usa “Probar endpoints” y comparte este detalle con soporte si el problema continúa.",
  }
}

/** Evita presentar los ítems planos históricos de Loggro como productos web. */
export function formatErpSyncCount(value: ErpSyncCountLike): string {
  if (value.productCount != null && value.variantCount != null) {
    return `${value.productCount} productos · ${value.variantCount} variantes`
  }
  return `${value.processedCount} registros ERP`
}

// ─────────────────────────────────────────────
// Indicadores de estado del panel de integraciones
// ─────────────────────────────────────────────

export type ErpIndicatorTone = "ok" | "warn" | "error" | "off"

export interface ErpIndicator {
  tone: ErpIndicatorTone
  label: string
  detail: string
}

export interface ErpIndicatorInputs {
  /** ERP_PROVIDER normalizado ("null" = sin ERP). */
  provider: string
  /** Resultado del healthcheck del adaptador. */
  connected: boolean
  catalogSyncAvailable: boolean
  /** Programación confirmada (la que realmente está guardada). */
  autoSyncEnabled: boolean
  /** Texto legible del intervalo, ej. "Cada 30 minutos". */
  intervalLabel: string
  /** Historial reciente, más nuevo primero. */
  history: Array<{ success: boolean }>
}

export interface ErpIndicators {
  api: ErpIndicator
  autoSync: ErpIndicator
  /** null cuando no hay ninguna corrida registrada. */
  lastSync: ErpIndicator | null
  /** Fallos consecutivos contando desde la corrida más reciente. */
  consecutiveFailures: number
}

export const NULL_ERP_PROVIDER = "null"

export function isErpConfigured(provider: string): boolean {
  return provider.trim().toLowerCase() !== NULL_ERP_PROVIDER
}

/** Cuenta fallos seguidos desde la corrida más reciente (historial ordenado desc). */
export function countConsecutiveFailures(history: Array<{ success: boolean }>): number {
  let failures = 0
  for (const run of history) {
    if (run.success) break
    failures += 1
  }
  return failures
}

function pluralizeRuns(count: number): string {
  return count === 1 ? "1 corrida fallida" : `${count} fallos seguidos`
}

/**
 * Deriva los tres indicadores del panel a partir del estado real. La regla
 * es no mostrar verde cuando algo no funciona: sin ERP configurado el
 * healthcheck del adaptador nulo siempre "responde", y una programación
 * activa cuyas corridas fallan no es una integración sana.
 */
export function getErpIndicators(inputs: ErpIndicatorInputs): ErpIndicators {
  const configured = isErpConfigured(inputs.provider)
  const consecutiveFailures = countConsecutiveFailures(inputs.history)
  const last = inputs.history[0] ?? null

  const api: ErpIndicator = !configured
    ? {
        tone: "off",
        label: "No configurado",
        detail:
          "No hay ERP conectado (ERP_PROVIDER). El adaptador nulo siempre responde: no indica conexión real.",
      }
    : inputs.connected
      ? {
          tone: "ok",
          label: "Responde",
          detail: "Healthcheck del ERP correcto; no valida catálogo ni stock.",
        }
      : {
          tone: "error",
          label: "Sin respuesta",
          detail: "El ERP no respondió al healthcheck. Revisa credenciales y conectividad.",
        }

  const autoSync: ErpIndicator = !configured
    ? { tone: "off", label: "No disponible", detail: "Conecta un ERP para programar sincronizaciones." }
    : !inputs.catalogSyncAvailable
      ? { tone: "off", label: "No disponible", detail: "El ERP no admite descarga de catálogo." }
      : !inputs.autoSyncEnabled
        ? { tone: "off", label: "Inactiva", detail: "Las sincronizaciones automáticas están apagadas." }
        : consecutiveFailures > 0
          ? {
              tone: "error",
              label: "Activa con errores",
              detail: `${inputs.intervalLabel}, pero acumula ${pluralizeRuns(consecutiveFailures)}.`,
            }
          : last === null
            ? {
                tone: "warn",
                label: "Activa, sin corridas",
                detail: `${inputs.intervalLabel}; todavía no se ha ejecutado ninguna.`,
              }
            : { tone: "ok", label: "Activa", detail: inputs.intervalLabel }

  const lastSync: ErpIndicator | null =
    last === null
      ? null
      : last.success
        ? { tone: "ok", label: "Correcta", detail: "La última corrida terminó sin errores." }
        : {
            tone: "error",
            label: "Con error",
            detail:
              consecutiveFailures > 1
                ? `${pluralizeRuns(consecutiveFailures)}; revisa el último error más abajo.`
                : "La última corrida falló; revisa el detalle más abajo.",
          }

  return { api, autoSync, lastSync, consecutiveFailures }
}
