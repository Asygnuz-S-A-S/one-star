"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { useSession } from "@/lib/auth-client"
import { DEFAULT_BOTTOM_NAV, type BottomNavItem } from "@/lib/storefront-copy"
import { useCart } from "@/store"

/** Rutas con su propia barra inferior (compra rápida, checkout) donde la navegación estorbaría. */
export function shouldShowMobileBottomNav(pathname: string): boolean {
  return !(
    pathname.startsWith("/productos/") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/carrito")
  )
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
}

const icons = {
  home: <svg {...iconProps}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  shop: <svg {...iconProps}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  search: <svg {...iconProps}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>,
  bag: <svg {...iconProps}><path d="M6 7h12l1 14H5z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>,
  user: <svg {...iconProps}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
}

const itemClass =
  "relative flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full font-barlow text-xs font-semibold uppercase tracking-[0.08em] transition-colors"

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      // Activo = píldora roja de marca: se distingue de un vistazo, no solo por un punto.
      className={`${itemClass} ${active ? "bg-store-action text-white shadow-[0_6px_16px_rgb(227_28_35/0.45)]" : "text-white/60 hover:text-white"}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}

export default function MobileBottomNav({ items = DEFAULT_BOTTOM_NAV }: { items?: BottomNavItem[] }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { totalItems, toggleCart } = useCart()

  if (!shouldShowMobileBottomNav(pathname)) return null

  const isCustomer = (session?.user as { userType?: string } | undefined)?.userType === "customer"

  return (
    <nav
      aria-label="Navegación inferior"
      className="relative z-40 shrink-0 px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      data-testid="mobile-bottom-nav"
    >
      <div className="mx-auto flex max-w-md items-center gap-1 rounded-full bg-store-ink/95 px-2 py-1.5 shadow-store-float backdrop-blur-md">
        {items.map((item) => {
          if (item.href === "#bolsa") {
            return (
              <button key={item.label} type="button" onClick={toggleCart} aria-label={`${item.label}, ${totalItems} productos`} className={`${itemClass} text-white/60 hover:text-white`}>
                {icons[item.icon]}
                <span aria-hidden="true">{item.label}</span>
                {totalItems > 0 && (
                  <span aria-hidden="true" className="absolute right-[22%] top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--store-action)] px-1 font-montserrat text-[10px] font-semibold text-white">
                    {totalItems}
                  </span>
                )}
              </button>
            )
          }
          const href = item.href === "/cuenta" && !isCustomer ? "/login" : item.href
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
          return <NavLink key={item.label} href={href} label={item.label} icon={icons[item.icon]} active={active} />
        })}
      </div>
    </nav>
  )
}
