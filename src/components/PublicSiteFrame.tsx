"use client"

import { useLayoutEffect, type ComponentProps, type CSSProperties, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import Header from "@/components/Header"
import ChatWidget from "@/components/chat/ChatWidget"
import StoreFooter from "@/components/storefront/StoreFooter"
import MobileBottomNav, { shouldShowMobileBottomNav } from "@/components/MobileBottomNav"
import { isAdminPathname } from "@/lib/public-site-route"
import type { BottomNavItem, FooterLink } from "@/lib/storefront-copy"

type PublicSiteFrameProps = ComponentProps<typeof Header> & {
  children: ReactNode
  chatEnabled?: boolean
  chatWelcome?: string
  footerLinks?: FooterLink[]
  bottomNav?: BottomNavItem[]
  storeName?: string
  contactEmail?: string | null
  whatsapp?: string | null
}

export default function PublicSiteFrame({
  children,
  chatEnabled = true,
  chatWelcome,
  footerLinks,
  bottomNav,
  storeName,
  contactEmail,
  whatsapp,
  ...headerProps
}: PublicSiteFrameProps) {
  const pathname = usePathname()

  useLayoutEffect(() => {
    if (isAdminPathname(pathname)) return
    const scroller = document.getElementById("public-scroll")
    if (!scroller) return
    const id = window.location.hash.replace("#", "")
    const target = id.startsWith("landing-section-") ? document.getElementById(id) : null
    if (!target) {
      scroller.scrollTo({ top: 0, left: 0, behavior: "instant" })
      return
    }
    const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    scroller.scrollTo({ top, left: 0, behavior: "instant" })
  }, [pathname])

  if (isAdminPathname(pathname)) {
    return <div className="flex-1">{children}</div>
  }

  const bannerIsVisible = !headerProps.banner || headerProps.banner.isActive
  const headerOffset = bannerIsVisible
    ? { "--public-header-offset": "88px", "--public-header-offset-desktop": "96px" }
    : { "--public-header-offset": "56px", "--public-header-offset-desktop": "64px" }

  return (
    <div className="public-storefront relative flex h-dvh min-h-0 flex-col overflow-hidden print:block print:h-auto print:overflow-visible" style={headerOffset as CSSProperties}>
      <div className="contents print:hidden" data-site-header>
        <Header {...headerProps} />
      </div>
      <div id="public-scroll" className="min-h-0 flex-1 overflow-y-auto print:overflow-visible">
        <div aria-hidden="true" className="print:hidden h-[var(--public-header-offset)] lg:h-[var(--public-header-offset-desktop)]" data-testid="public-site-spacer" />
        <main id="contenido-principal">{children}</main>
        <div className="contents print:hidden">
          <div className="contents" data-site-footer>
            <StoreFooter
              links={footerLinks}
              storeName={storeName}
              contactEmail={contactEmail}
              whatsapp={whatsapp}
            />
          </div>
          {/* Espacio para que el menú flotante no tape el final del footer; mismo color del footer. */}
          {/* En la ficha la barra fija de compra ocupa el mismo lugar que el menú. */}
          {(shouldShowMobileBottomNav(pathname) || pathname.startsWith("/productos/")) && (
            <div aria-hidden="true" data-site-bottom-nav className="h-[calc(4.75rem+env(safe-area-inset-bottom))] bg-[#1C1C1C] lg:hidden" />
          )}
        </div>
      </div>
      <div className="contents print:hidden">
        {/* En el checkout el botón flotante tapaba los campos en celular. */}
        {chatEnabled && !pathname.startsWith("/checkout") && <ChatWidget welcome={chatWelcome} />}
        <div className="contents" data-site-bottom-nav>
          <MobileBottomNav items={bottomNav} />
        </div>
      </div>
    </div>
  )
}
