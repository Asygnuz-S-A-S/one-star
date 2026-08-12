import { format, formatDistanceToNow, parseISO } from "date-fns"
import { es } from "date-fns/locale"

type DateInput = Date | string | number

function toDate(value: DateInput): Date {
  if (value instanceof Date) return value
  if (typeof value === "number") return new Date(value)
  // ISO string or any parseable string
  return parseISO(value)
}

/** dd/MM/yyyy — "04/01/2024" */
export function formatDate(value: DateInput): string {
  return format(toDate(value), "dd/MM/yyyy", { locale: es })
}

/** d 'de' MMMM 'de' yyyy — "4 de enero de 2024" */
export function formatDateLong(value: DateInput): string {
  return format(toDate(value), "d 'de' MMMM 'de' yyyy", { locale: es })
}

/** dd MMM — "04 ene" (rango sin año, e.g. fechas de banner) */
export function formatDateShort(value: DateInput): string {
  return format(toDate(value), "dd MMM", { locale: es })
}

/** dd/MM/yyyy HH:mm — "04/01/2024 14:30" */
export function formatDateTime(value: DateInput): string {
  return format(toDate(value), "dd/MM/yyyy HH:mm", { locale: es })
}

/**
 * Tiempo relativo desde ahora — "hace 3 días", "en 2 horas"
 * Útil para columnas "última actividad" o timestamps de eventos.
 */
export function formatRelative(value: DateInput): string {
  return formatDistanceToNow(toDate(value), { locale: es, addSuffix: true })
}

/**
 * Formatea un número como moneda COP.
 * "$1.200.000"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}
