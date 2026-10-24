"use client"

import type { ComponentProps, CSSProperties, ReactNode } from "react"
import { usePathname } from "next/navigation"

import Header from "@/components/Header"
import ChatWidget from "@/components/chat/ChatWidget"
import MobileBottomNav, { shouldShowMobileBottomNav } from "@/components/MobileBottomNav"
import { isAdminPathname } from "@/lib/public-site-route"

type PublicSiteFrameProps = ComponentProps<typeof Header> & {
  children: ReactNode
}

export default function PublicSiteFrame({ children, ...headerProps }: PublicSiteFrameProps) {
  const pathname = usePathname()

  if (isAdminPathname(pathname)) {
    return <div className="flex-1">{children}</div>
  }

  const bannerIsVisible = !headerProps.banner || headerProps.banner.isActive
  const headerOffset = bannerIsVisible
    ? { "--public-header-offset": "88px", "--public-header-offset-desktop": "96px" }
    : { "--public-header-offset": "56px", "--public-header-offset-desktop": "64px" }

  return (
    <div className="public-storefront flex min-h-0 flex-1 flex-col" style={headerOffset as CSSProperties}>
      <Header {...headerProps} />
      <div aria-hidden="true" className="h-[var(--public-header-offset)] lg:h-[var(--public-header-offset-desktop)]" data-testid="public-site-spacer" />
      <main id="contenido-principal" className={`flex-1 ${shouldShowMobileBottomNav(pathname) ? "pb-24 lg:pb-0" : ""}`}>{children}</main>
      <ChatWidget />
      <MobileBottomNav />
    </div>
  )
}
