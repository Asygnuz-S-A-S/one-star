import Link from "next/link"
import { DEFAULT_FOOTER_LINKS, type FooterLink } from "@/lib/storefront-copy"
import CookiePreferencesButton from "@/components/legal/CookiePreferencesButton"

export default function StoreFooter({
  links = DEFAULT_FOOTER_LINKS,
  storeName = "One Star",
  contactEmail,
  whatsapp,
}: {
  links?: FooterLink[]
  storeName?: string
  contactEmail?: string | null
  whatsapp?: string | null
}) {
  const phone = whatsapp?.replace(/[^\d+]/g, "")
  return (
    <footer className="border-t border-[#E0E0E0] bg-[#1C1C1C] text-white">
      <div className="store-gutter mx-auto grid max-w-6xl gap-8 py-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        <div>
          <p className="font-barlow text-xl font-bold tracking-[0.18em]">{storeName.toUpperCase()}</p>
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
        <nav aria-label="Pie de página" className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          {links.map((link) => (
            <Link key={`${link.href}-${link.label}`} href={link.href} className="min-h-11 font-montserrat text-sm text-white/80 underline-offset-2 hover:text-white hover:underline">
              {link.label}
            </Link>
          ))}
          <CookiePreferencesButton />
        </nav>
      </div>
    </footer>
  )
}
