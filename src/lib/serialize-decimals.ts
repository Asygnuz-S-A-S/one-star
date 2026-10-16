import { Prisma } from "@prisma/client"
import type { Decimal } from "@prisma/client/runtime/library"

/**
 * Tipo resultante de reemplazar cada `Decimal` de Prisma por `number`,
 * conservando fechas, arreglos y objetos anidados.
 */
export type WithPlainDecimals<T> = T extends Decimal
  ? number
  : T extends Date
    ? T
    : T extends Array<infer U>
      ? WithPlainDecimals<U>[]
      : T extends object
        ? { [K in keyof T]: WithPlainDecimals<T[K]> }
        : T

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Convierte recursivamente los `Decimal` de Prisma a `number` para que el
 * objeto pueda cruzar la frontera Server Component → Client Component.
 * Devuelve un objeto nuevo; no muta el original.
 */
export function serializeDecimals<T>(value: T): WithPlainDecimals<T> {
  if (Prisma.Decimal.isDecimal(value)) {
    return (value as unknown as Decimal).toNumber() as WithPlainDecimals<T>
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeDecimals(item)) as WithPlainDecimals<T>
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value).map(([key, item]) => [key, serializeDecimals(item)])
    return Object.fromEntries(entries) as WithPlainDecimals<T>
  }
  return value as WithPlainDecimals<T>
}
