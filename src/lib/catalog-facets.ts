const LETTER_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"]

/**
 * Orden de tallas para los filtros: numéricas de menor a mayor (adulto), luego las
 * infantiles con sufijo (7I, 12J, 5B…), luego letras (S, M, L) y al final el resto ("U", "Única").
 */
export function compareSizes(a: string, b: string): number {
  const rank = (size: string): [number, number, string] => {
    const value = size.trim().toUpperCase()
    const numeric = /^\d+(\.\d+)?$/.test(value)
    if (numeric) return [0, Number(value), value]
    const kids = value.match(/^(\d+(?:\.\d+)?)([A-Z])$/)
    if (kids) return [1, Number(kids[1]), kids[2]]
    const letter = LETTER_SIZES.indexOf(value)
    if (letter >= 0) return [2, letter, value]
    return [3, 0, value]
  }
  const [ga, na, sa] = rank(a)
  const [gb, nb, sb] = rank(b)
  return ga - gb || na - nb || sa.localeCompare(sb)
}

/** Un color por nombre sin importar mayúsculas ("AZUL" y "Azul" son el mismo filtro). */
export function dedupeColors(colors: string[]): string[] {
  const seen = new Map<string, string>()
  for (const color of colors) {
    const key = color.trim().toLocaleLowerCase("es")
    if (!seen.has(key)) seen.set(key, color.trim())
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
}
