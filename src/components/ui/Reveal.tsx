import type { ReactNode } from "react"

import ScrollReveal from "@/components/home/ScrollReveal"

interface RevealProps {
  children: ReactNode
  /** Retardo antes de animar, en segundos. */
  delay?: number
  className?: string
}

/**
 * Aparición al entrar en viewport. El contenido se pinta visible desde el
 * servidor y solo se anima el desplazamiento: ocultarlo con opacity 0 dejaba
 * huecos en blanco al hacer scroll rápido en móvil y retrasaba el LCP.
 */
export default function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <ScrollReveal className={className} style={delay ? { animationDelay: `${delay}s` } : undefined}>
      {children}
    </ScrollReveal>
  )
}
