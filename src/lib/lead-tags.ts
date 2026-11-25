export const PRESET_LEAD_TAGS = [
  "Cliente potencial",
  "Compró",
  "Carrito abandonado",
  "VIP",
  "Pauta Meta",
  "Interés Addi",
  "Recoger en tienda",
  "Consultó pedido",
  "Pidió asesora",
  "Reclamo / Garantía",
  "Baja",
  "Vans",
  "Converse",
  "New Balance",
  "Hoka",
  "On",
  "Skechers",
  "New Era",
] as const

export const MAX_LEAD_TAGS = 25
export const MAX_LEAD_TAG_LENGTH = 40

/**
 * Limpia una etiqueta individual para almacenamiento y comparación consistente.
 */
export function normalizeLeadTag(raw: string): string {
  return String(raw ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LEAD_TAG_LENGTH)
}

/**
 * Deduplica (insensible a mayúsculas) y acota una lista de etiquetas.
 */
export function normalizeLeadTags(raw: readonly string[] | null | undefined): string[] {
  if (!raw || raw.length === 0) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of raw) {
    const clean = normalizeLeadTag(item)
    if (!clean) continue
    const key = clean.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(clean)
    if (result.length >= MAX_LEAD_TAGS) break
  }
  return result
}

/**
 * Mezcla etiquetas existentes con adiciones y eliminaciones sin perder etiquetas previas.
 */
export function mergeLeadTags(
  existing: readonly string[] | null | undefined,
  add: readonly string[] | null | undefined,
  remove?: readonly string[] | null | undefined
): string[] {
  const removeKeys = new Set(
    (remove ?? []).map((t) => normalizeLeadTag(t).toLowerCase()).filter(Boolean)
  )
  const kept = normalizeLeadTags(existing).filter((t) => !removeKeys.has(t.toLowerCase()))
  return normalizeLeadTags([...kept, ...(add ?? [])])
}
