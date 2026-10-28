/**
 * Utilidades para cálculo de plazos legales en días hábiles (lunes a viernes).
 * Conforme a la Ley 1581 de 2012 (Habeas Data):
 * - Consultas: 10 días hábiles
 * - Reclamos y supresión: 15 días hábiles
 */

export function getLegalTermBusinessDays(type: string): number {
  return type === "CONSULTA" ? 10 : 15
}

/**
 * Cuenta los días hábiles transcurridos entre dos fechas (excluye sábados y domingos).
 */
export function countElapsedBusinessDays(startDate: Date, endDate: Date = new Date()): number {
  if (endDate <= startDate) return 0

  const current = new Date(startDate)
  // Empezar a contar a partir del día siguiente al radicado (regla procesal)
  current.setDate(current.getDate() + 1)
  current.setHours(0, 0, 0, 0)

  const target = new Date(endDate)
  target.setHours(23, 59, 59, 999)

  let businessDays = 0
  while (current <= target) {
    const dayOfWeek = current.getDay()
    // 0 = domingo, 6 = sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++
    }
    current.setDate(current.getDate() + 1)
  }

  return businessDays
}

export interface BusinessDaysRemainingInfo {
  maxDays: number
  elapsedDays: number
  remainingDays: number
  isOverdue: boolean
  label: string
}

export function calculateBusinessDaysRemaining(
  createdAt: Date | string,
  type: string,
  referenceDate: Date = new Date()
): BusinessDaysRemainingInfo {
  const start = typeof createdAt === "string" ? new Date(createdAt) : createdAt
  const maxDays = getLegalTermBusinessDays(type)
  const elapsedDays = countElapsedBusinessDays(start, referenceDate)
  const remainingDays = maxDays - elapsedDays
  const isOverdue = remainingDays < 0

  let label: string
  if (isOverdue) {
    label = `Vencido hace ${Math.abs(remainingDays)} día${Math.abs(remainingDays) === 1 ? " hábil" : "s hábiles"}`
  } else if (remainingDays === 0) {
    label = "Vence hoy (último día hábil)"
  } else {
    label = `${remainingDays} día${remainingDays === 1 ? " hábil" : "s hábiles"} restante${remainingDays === 1 ? "" : "s"}`
  }

  return {
    maxDays,
    elapsedDays,
    remainingDays,
    isOverdue,
    label,
  }
}
