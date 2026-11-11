import Image from "next/image"
import Link from "next/link"
import { DEFAULT_FOOTER_LINKS, type FooterLink } from "@/lib/storefront-copy"
import CookiePreferencesButton from "@/components/legal/CookiePreferencesButton"

export default function StoreFooter({
  links = DEFAULT_FOOTER_LINKS,
  storeName = "One Star",
  contactEmail,
  whatsapp,
  logoUrl,
}: {
  links?: FooterLink[]
  storeName?: string
  contactEmail?: string | null
  whatsapp?: string | null
  /** Logo principal de «Logos Grandes / Footer» (Admin → Constructor → Logos). Sin logo, el nombre en texto. */
  logoUrl?: string | null
}) {
  const phone = whatsapp?.replace(/[^\d+]/g, "")
  // Más compacto en escritorio; en celular se conserva el alto de 44 px para tocar cada enlace.
  const linkClass = "inline-flex min-h-11 items-center font-montserrat text-sm text-white/80 underline-offset-2 hover:text-white hover:underline lg:min-h-0 lg:py-1"
  return (
    <footer className="border-t border-[#E0E0E0] bg-[#1C1C1C] text-white">
      <div className="store-gutter mx-auto grid max-w-6xl gap-6 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10">
        <div>
          {logoUrl ? (
            <Link href="/" aria-label={`${storeName} — Inicio`} className="relative block h-14 w-[120px]">
              <Image src={logoUrl} alt={storeName} fill className="object-contain object-left" sizes="120px" unoptimized />
            </Link>
          ) : (
            <p className="font-barlow text-xl font-bold tracking-[0.18em]">{storeName.toUpperCase()}</p>
          )}
          <p className="mt-2 max-w-xs font-montserrat text-sm text-white/70">
            Calzado urbano y deportivo. Envíos a toda Colombia.
          </p>
          <div className="mt-4 space-y-1 font-montserrat text-sm text-white/80">
            {contactEmail && (
              <a className="block underline-offset-2 hover:underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>
            )}
            {phone && (
              <a className="block underline-offset-2 hover:underline" href={`https://wa.me/${phone.replace("+", "")}`}>WhatsApp {whatsapp}</a>
            )}
          </div>
        </div>
        <nav aria-label="Pie de página" className="grid grid-cols-2 content-start gap-x-6 sm:grid-cols-3 lg:gap-y-1">
          {links.map((link) => (
            <Link key={`${link.href}-${link.label}`} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
          {/* Los enlaces se editan en Configuración; el rastreo sin cuenta siempre debe estar a la mano. */}
          {!links.some((link) => link.href === "/rastrear-pedido") && (
            <Link href="/rastrear-pedido" className={linkClass}>
              Rastrear pedido
            </Link>
          )}
          <CookiePreferencesButton className={`${linkClass} text-left`} />
        </nav>
      </div>
      <div className="border-t border-white/10 py-3 text-center font-montserrat text-xs text-white/50">
        <p>© {new Date().getFullYear()} {storeName}. Todos los derechos reservados. · Versión 19</p>
      </div>
    </footer>
  )
}
