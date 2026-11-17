/**
 * Texto del plazo para tener listo un pedido de "recoger en tienda" (Admin → Información de la tienda).
 * Sin plazo configurado devuelve null: la tienda no promete un tiempo que One Star no definió.
 */
export function formatPickupReadyTime(min: number | null | undefined, max: number | null | undefined): string | null {
  if (min == null || max == null || min < 0 || max < min) return null
  if (max === 0) return "Listo para recoger el mismo día hábil."
  const unit = (n: number) => (n === 1 ? "día hábil" : "días hábiles")
  if (min === max) return `Listo para recoger en ${max} ${unit(max)}.`
  if (min === 0) return `Listo para recoger el mismo día o hasta en ${max} ${unit(max)}.`
  return `Listo para recoger en ${min} a ${max} días hábiles.`
}
