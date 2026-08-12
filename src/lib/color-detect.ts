/**
 * Detección del color de una variante a partir del texto que envía el ERP.
 *
 * Loggro no expone el color como campo propio, pero sí lo incluye en la
 * descripción del ítem ("TENIS HOKA BONDI 9 NEGRO", "... CLASSIC 4 BLANCO").
 * Aquí se busca cualquier color de la paleta administrable dentro de ese texto.
 *
 * La paleta llega desde la base de datos, así que agregar un color en
 * /admin/colores basta para que empiece a detectarse.
 */

/** Quita acentos y unifica mayúsculas para comparar sin falsos negativos. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Variantes de escritura de un color tal como aparecen en las descripciones:
 * el género gramatical cambia ("NEGRO" / "NEGRA", "BLANCO" / "BLANCA").
 */
function spellingVariants(colorName: string): string[] {
  const base = normalize(colorName)
  const variants = [base]

  if (base.endsWith("O")) variants.push(`${base.slice(0, -1)}A`)
  else if (base.endsWith("A")) variants.push(`${base.slice(0, -1)}O`)

  return variants
}

/** ¿Aparece `needle` como palabra completa dentro de `haystack`? */
function containsWord(haystack: string, needle: string): boolean {
  // Los límites de palabra evitan que "ROJO" haga match dentro de "ROJOSCURO"
  // y permiten nombres con espacios como "AZUL MARINO".
  return new RegExp(`(^|[^A-Z0-9])${escapeRegExp(needle)}([^A-Z0-9]|$)`).test(haystack)
}

/**
 * Devuelve el color de la paleta mencionado en el texto, o `null` si ninguno.
 *
 * Ante varias coincidencias gana el nombre más largo, para que "Azul Marino"
 * no se confunda con "Azul".
 *
 * @param text        Descripción del ítem (idealmente la detallada).
 * @param colorNames  Nombres de la paleta, tal como deben guardarse.
 */
export function detectColorFromText(
  text: string | null | undefined,
  colorNames: readonly string[]
): string | null {
  if (!text) return null

  const haystack = normalize(text)
  const byLengthDesc = [...colorNames].sort((a, b) => b.length - a.length)

  for (const colorName of byLengthDesc) {
    if (!colorName.trim()) continue
    for (const variant of spellingVariants(colorName)) {
      if (containsWord(haystack, variant)) return colorName
    }
  }

  return null
}
