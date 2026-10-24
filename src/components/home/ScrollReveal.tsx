"use client"

import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react"

type ScrollRevealProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

/**
 * Adds a subtle entrance after the section reaches the viewport. Content is
 * visible on the server and with reduced motion, so it is never gated by JS.
 */
export default function ScrollReveal({ children, className = "", ...props }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const element = ref.current
    if (!element || !("IntersectionObserver" in window)) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      setRevealed(true)
      observer.disconnect()
    }, { rootMargin: "0px 0px -10%", threshold: 0.12 })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} data-revealed={revealed || undefined} className={`home-scroll-reveal ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}
