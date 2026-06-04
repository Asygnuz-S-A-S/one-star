"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import hotkeys from "hotkeys-js"

// Pages that have a "Nuevo" creation route
const NEW_ROUTES: Record<string, string> = {
  "/admin/productos": "/admin/productos/nuevo",
}

interface UseAdminHotkeysOptions {
  onShowHelp: () => void
}

export function useAdminHotkeys({ onShowHelp }: UseAdminHotkeysOptions) {
  const router = useRouter()
  const pathname = usePathname()

  // Keep refs so useEffect deps stay stable
  const routerRef = useRef(router)
  const pathnameRef = useRef(pathname)
  const onShowHelpRef = useRef(onShowHelp)

  useEffect(() => { routerRef.current = router }, [router])
  useEffect(() => { pathnameRef.current = pathname }, [pathname])
  useEffect(() => { onShowHelpRef.current = onShowHelp }, [onShowHelp])

  // Sequence state: tracks whether "g" was pressed recently
  const pendingRef = useRef<string | null>(null)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setPending = useCallback((key: string) => {
    pendingRef.current = key
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    pendingTimerRef.current = setTimeout(() => {
      pendingRef.current = null
    }, 1500)
  }, [])

  const clearPending = useCallback(() => {
    pendingRef.current = null
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    pendingTimerRef.current = null
  }, [])

  useEffect(() => {
    // Don't fire hotkeys while the user is typing in a form field
    hotkeys.filter = (event: KeyboardEvent): boolean => {
      const target = event.target as HTMLElement | null
      if (!target) return true
      const tag = target.tagName.toLowerCase()
      return (
        !["input", "textarea", "select"].includes(tag) &&
        !target.isContentEditable
      )
    }

    // ── g prefix for navigate-to sequences ─────────────────────────────────
    hotkeys("g", () => {
      setPending("g")
    })

    hotkeys("p", (e) => {
      if (pendingRef.current !== "g") return
      e.preventDefault()
      clearPending()
      routerRef.current.push("/admin/productos")
    })

    hotkeys("o", (e) => {
      if (pendingRef.current !== "g") return
      e.preventDefault()
      clearPending()
      routerRef.current.push("/admin/pedidos")
    })

    hotkeys("c", (e) => {
      if (pendingRef.current !== "g") return
      e.preventDefault()
      clearPending()
      routerRef.current.push("/admin/clientes")
    })

    hotkeys("b", (e) => {
      if (pendingRef.current !== "g") return
      e.preventDefault()
      clearPending()
      routerRef.current.push("/admin/banners")
    })

    // ── n → create new (context-aware) ─────────────────────────────────────
    hotkeys("n", (e) => {
      const newRoute = NEW_ROUTES[pathnameRef.current]
      if (!newRoute) return
      e.preventDefault()
      routerRef.current.push(newRoute)
    })

    // ── ? → help modal ──────────────────────────────────────────────────────
    hotkeys("?", (e) => {
      e.preventDefault()
      onShowHelpRef.current()
    })

    // ── Escape → broadcast to all open modals/drawers ───────────────────────
    hotkeys("escape", (e) => {
      e.preventDefault()
      document.dispatchEvent(new CustomEvent("admin:escape"))
    })

    return () => {
      hotkeys.unbind("g")
      hotkeys.unbind("p")
      hotkeys.unbind("o")
      hotkeys.unbind("c")
      hotkeys.unbind("b")
      hotkeys.unbind("n")
      hotkeys.unbind("?")
      hotkeys.unbind("escape")
      clearPending()
    }
  }, [setPending, clearPending])
}
