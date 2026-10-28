import "server-only"

import { z } from "zod"

export const assistantProductsQuerySchema = z.object({
  q: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  gender: z
    .enum(["hombre", "mujer", "unisex", "nino", "nina", "infantil", "bebe", "ninos"])
    .optional(),
  size: z.string().trim().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  limit: z.coerce.number().int().min(1).max(5).default(5),
})

export type AssistantProductsQuery = z.infer<typeof assistantProductsQuerySchema>

export const assistantStockQuerySchema = z.object({
  product: z.string().trim().min(1, "El parámetro 'product' es requerido"),
  size: z.string().trim().min(1, "El parámetro 'size' es requerido"),
})

export type AssistantStockQuery = z.infer<typeof assistantStockQuerySchema>

export const assistantOrderQuerySchema = z.object({
  cedula: z.string().trim().min(1, "El parámetro 'cedula' es requerido"),
  waPhone: z.string().trim().min(1, "El parámetro 'waPhone' es requerido"),
  number: z.string().trim().optional(),
})

export type AssistantOrderQuery = z.infer<typeof assistantOrderQuerySchema>

/**
 * Normaliza una cadena extrayendo únicamente los dígitos.
 */
export function normalizeDigits(text: string): string {
  return text.replace(/\D/g, "")
}

/**
 * Normaliza el teléfono para comparación: extrae dígitos y toma los últimos 10
 * (número estándar móvil en Colombia, descartando indicativos como 57 o +57).
 */
export function normalizePhone10(phone: string): string {
  const digits = normalizeDigits(phone)
  return digits.length >= 10 ? digits.slice(-10) : digits
}

/**
 * Quita tildes, diacríticos y convierte a minúsculas para búsquedas insensibles.
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}
