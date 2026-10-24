export const DEFAULT_CHAT_WELCOME =
  "¡Hola! Soy el asistente de One Star. Pregúntame por cualquier producto — puedo revisar precio, tallas y stock, y agregarlo directo a tu carrito."

export const DEFAULT_CLUB_HEADLINE = "One Star Club"

export const DEFAULT_CLUB_INTRO =
  "La comunidad de quienes viven la cultura urbana y el rendimiento. Únete gratis y accede a promociones pensadas solo para miembros."

export const DEFAULT_CLUB_WELCOME_SUBJECT = "Bienvenido a One Star Club"

export const DEFAULT_CLUB_WELCOME_BODY =
  "Ya eres parte de One Star Club. Desde tu cuenta puedes ver las promociones exclusivas para miembros y usar sus códigos en el checkout."

export interface ClubBenefit {
  title: string
  detail: string
}

export const DEFAULT_CLUB_BENEFITS: ClubBenefit[] = [
  { title: "Promociones exclusivas", detail: "Cupones solo para miembros. Los ves aquí y los usas en el checkout." },
  { title: "Primero en enterarte", detail: "Si lo aceptas, lanzamientos y novedades llegan directo a tu correo." },
  { title: "Gratis, sin compromiso", detail: "Unirte no tiene costo y puedes salir cuando quieras desde tu cuenta." },
]

export interface FooterLink {
  label: string
  href: string
}

export const DEFAULT_FOOTER_LINKS: FooterLink[] = [
  { label: "Tienda", href: "/productos" },
  { label: "Lanzamientos", href: "/lanzamientos" },
  { label: "Sale", href: "/sale" },
  { label: "One Star Club", href: "/club" },
  { label: "Tarjeta de regalo", href: "/tarjeta-regalo" },
  { label: "Tiendas", href: "/tiendas" },
  { label: "Términos", href: "/terminos" },
  { label: "Privacidad", href: "/privacidad" },
]

/** Una línea "título | detalle". Las líneas vacías se ignoran. */
export function parseClubBenefits(raw: string | null | undefined): ClubBenefit[] {
  const lines = (raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return DEFAULT_CLUB_BENEFITS
  return lines.map((line) => {
    const [title, ...rest] = line.split("|")
    return {
      title: title.trim(),
      detail: rest.join("|").trim() || title.trim(),
    }
  }).filter((benefit) => benefit.title.length > 0)
}

export function formatClubBenefits(benefits: ClubBenefit[]): string {
  return benefits.map((benefit) => `${benefit.title} | ${benefit.detail}`).join("\n")
}

/** Una línea "etiqueta | /ruta". Solo acepta rutas internas. */
export function parseFooterLinks(raw: string | null | undefined): FooterLink[] {
  const lines = (raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return DEFAULT_FOOTER_LINKS
  const links = lines.flatMap((line) => {
    const [label, href] = line.split("|").map((part) => part.trim())
    if (!label || !href || !href.startsWith("/") || href.startsWith("//")) return []
    return [{ label, href }]
  })
  return links.length > 0 ? links : DEFAULT_FOOTER_LINKS
}

export function giftCardExpiry(from: Date, months: number): Date {
  const next = new Date(from)
  next.setMonth(next.getMonth() + months)
  return next
}
