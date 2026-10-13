/** Enlace wa.me a partir del número guardado en la configuración. `null` si no hay un número usable. */
export function buildWhatsappUrl(number: string | null | undefined, message: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "")
  if (digits.length < 7) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
