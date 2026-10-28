"use client"

import { formatCOP } from "@/lib/shop-utils"

interface ClosingCtaProps {
  name: string
  price: number
  /** id del bloque de compra al que se vuelve (donde el cliente elige talla y agrega). */
  targetId: string
}

/** Último empujón al final de la página: lleva al cliente de vuelta al bloque de compra. */
export default function ClosingCta({ name, price, targetId }: ClosingCtaProps) {
  function goToBuyBox() {
    const target = document.getElementById(targetId)
    target?.scrollIntoView({ behavior: "smooth", block: "center" })
  }
  return (
    <section aria-label="Comprar ahora" className="mb-16 rounded-3xl bg-[#1C1C1C] px-6 py-10 text-center text-white md:px-12 md:py-14" data-testid="closing-cta">
      <p className="font-montserrat text-xs uppercase tracking-[0.2em] text-white/60">Listo para llevártelos</p>
      <h2 className="mx-auto mt-2 max-w-2xl font-barlow text-3xl font-black uppercase leading-tight md:text-4xl">{name}</h2>
      <p className="mt-2 font-barlow text-2xl font-bold">{formatCOP(price)}</p>
      <button
        type="button"
        onClick={goToBuyBox}
        className="mt-6 inline-block bg-[#E31C23] px-10 py-4 font-barlow text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#C01920]"
      >
        Elegir mi talla y comprar
      </button>
    </section>
  )
}
