/**
 * Parte la búsqueda en palabras para que "converse negro" encuentre
 * "TENIS CONVERSE ... NEGROS": cada palabra debe aparecer en algún campo,
 * en cualquier orden. Los plurales se recortan ("negros" → "negro").
 */
export function searchTerms(q: string): string[] {
  const words = q
    .toLowerCase()
    .split(/[\s,.;/]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1)
    .map((w) => (w.length > 4 ? w.replace(/(es|s)$/, "") : w))
  return [...new Set(words)].slice(0, 8)
}
