"use client"

import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"

type Direction = "up" | "down" | "left" | "right" | "scale"

interface RevealProps {
  children: ReactNode
  /** Retardo antes de animar, en segundos. */
  delay?: number
  /** Dirección desde la que entra el contenido. */
  from?: Direction
  className?: string
}

const OFFSET = 40

function hiddenState(from: Direction) {
  switch (from) {
    case "up":
      return { opacity: 0, y: OFFSET }
    case "down":
      return { opacity: 0, y: -OFFSET }
    case "left":
      return { opacity: 0, x: OFFSET }
    case "right":
      return { opacity: 0, x: -OFFSET }
    case "scale":
      return { opacity: 0, scale: 0.9 }
  }
}

/**
 * Envoltorio de aparición al entrar en viewport. Usa un resorte con rebote
 * (estilo lúdico) y respeta `prefers-reduced-motion` desactivando el
 * desplazamiento para quien lo prefiera.
 */
export default function Reveal({ children, delay = 0, from = "up", className }: RevealProps) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : hiddenState(from)}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={
        reduce
          ? { duration: 0.3 }
          : { type: "spring", stiffness: 320, damping: 16, delay }
      }
    >
      {children}
    </motion.div>
  )
}
