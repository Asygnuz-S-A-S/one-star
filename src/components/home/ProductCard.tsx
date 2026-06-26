"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "motion/react"

interface ProductCardProps {
  id: string
  slug?: string
  name: string
  brand: string
  price: number
  salePrice?: number
  imageUrl?: string
  isNew?: boolean
  isOnSale?: boolean
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export default function ProductCard({ id, slug, name, brand, price, salePrice, imageUrl, isNew, isOnSale }: ProductCardProps) {
  const href = slug ? `/productos/${slug}` : undefined

  return (
    <motion.article
      className="group cursor-pointer relative"
      data-product-id={id}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Image container */}
      {href && <Link href={href} className="absolute inset-0 z-10" aria-label={name} />}
      <div className="relative aspect-[3/4] bg-[#E0E0E0] overflow-hidden mb-3">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#4A4A4A]/30"
            >
              <path
                d="M8 40 C8 40 12 28 24 28 C30 28 34 32 40 32 C46 32 52 28 56 30 L56 42 C56 44 54 46 52 46 L12 46 C10 46 8 44 8 42 Z"
                fill="currentColor"
              />
              <path
                d="M24 28 L20 18 L28 18 L32 28"
                fill="currentColor"
                opacity="0.6"
              />
            </svg>
          </div>
        )}

        {/* Badge */}
        {(isNew || isOnSale) && (
          <span
            className={`absolute top-2 left-2 text-white text-[10px] font-[var(--font-barlow)] font-bold uppercase tracking-wider px-2 py-1 ${isOnSale ? "bg-[#E31C23]" : "bg-[#1C1C1C]"}`}
          >
            {isOnSale ? "SALE" : "NUEVO"}
          </span>
        )}

        {/* Add to cart button */}
        <button
          className="absolute bottom-0 left-0 right-0 bg-[#1C1C1C] text-white font-[var(--font-barlow)] font-bold uppercase text-xs tracking-widest py-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200"
          onClick={(e) => {
            e.preventDefault()
            // cart logic here
          }}
        >
          Agregar al Carrito
        </button>
      </div>

      {/* Info */}
      <div>
        <p className="font-[var(--font-montserrat)] text-[#4A4A4A] text-xs uppercase tracking-wider mb-1">
          {brand}
        </p>
        <h3 className="font-[var(--font-barlow)] font-semibold text-[#1C1C1C] text-sm leading-tight mb-2">
          {name}
        </h3>
        <div className="flex items-center gap-2">
          {salePrice ? (
            <>
              <span className="font-[var(--font-montserrat)] font-bold text-[#E31C23] text-sm">
                {formatPrice(salePrice)}
              </span>
              <span className="font-[var(--font-montserrat)] text-[#4A4A4A] text-xs line-through">
                {formatPrice(price)}
              </span>
            </>
          ) : (
            <span className="font-[var(--font-montserrat)] font-bold text-[#1C1C1C] text-sm">
              {formatPrice(price)}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  )
}
