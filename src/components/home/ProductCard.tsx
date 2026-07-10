"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "motion/react"
import { useState } from "react"
import { useSession } from "@/lib/auth-client"

interface ProductCardProps {
  id: string
  slug?: string
  name: string
  brand: string
  price: number
  salePrice?: number
  imageUrl?: string
  secondaryImageUrl?: string
  gallery?: string[]
  isNew?: boolean
  isOnSale?: boolean
  hasStock?: boolean
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export default function ProductCard({ id, slug, name, brand, price, salePrice, imageUrl, secondaryImageUrl, gallery, isNew, isOnSale, hasStock = true }: ProductCardProps) {
  const href = slug ? `/productos/${slug}` : undefined
  const { data: session } = useSession()
  const [isFavorite, setIsFavorite] = useState(false)

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFavorite(!isFavorite)
  }

  const discountPercentage = isOnSale && salePrice && price > 0
    ? Math.round((1 - Number(salePrice) / Number(price)) * 100)
    : 0

  // 3D Sequence Logic — zonas dinámicas según cantidad de imágenes
  // Más ángulos = animación más fluida. Orden recomendado: izq → 3/4 izq → frente → 3/4 der → der
  const frames = [imageUrl, secondaryImageUrl, ...(gallery || [])].filter(Boolean) as string[]
  const hasFrames = frames.length > 0
  const [activeFrame, setActiveFrame] = useState(0)
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseMoveSequence = (e: React.MouseEvent<HTMLDivElement>) => {
    if (frames.length <= 1) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width))
    // Distribuir las N imágenes de forma uniforme a lo largo del ancho
    const frameIndex = Math.floor(x * frames.length)
    setActiveFrame(frameIndex)
  }

  const handleMouseEnterSequence = () => {
    setIsHovering(true)
    setActiveFrame(0)
  }

  const handleMouseLeaveSequence = () => {
    setIsHovering(false)
    setActiveFrame(0)
  }

  return (
    <motion.article
      className="group cursor-pointer relative flex flex-col h-full"
      data-product-id={id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Image container with 3D Sequence Sequence */}
      {href && <Link href={href} className="absolute inset-0 z-20" aria-label={name} />}
      <div 
        className="relative aspect-[3/4] bg-[#F5F5F5] dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 overflow-hidden mb-4 rounded-xl shadow-sm transition-shadow duration-300 group-hover:shadow-2xl"
        onMouseMove={handleMouseMoveSequence}
        onMouseEnter={handleMouseEnterSequence}
        onMouseLeave={handleMouseLeaveSequence}
      >
        <div className="w-full h-full">
          {/* Subtle overlay gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none rounded-xl" />
          
          {hasFrames ? (
            <div className="absolute inset-0 w-full h-full pointer-events-none">
              {frames.map((src, index) => (
                <Image
                  key={`frame-${index}`}
                  src={src}
                  alt={`${name} vista ${index + 1}`}
                  fill
                  priority={index === 0}
                  className={`object-cover object-center transition-opacity duration-150 ease-in-out ${
                    index === activeFrame ? "opacity-100" : "opacity-0"
                  }`}
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ))}

            </div>

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
                  d="M16 16H48V48H16V16Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M16 48L32 32L48 48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>

        {/* Top-Left Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {isNew && (
            <span className="bg-[#1C1C1C] text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider shadow-sm w-max rounded-sm">
              NUEVO
            </span>
          )}
          {isOnSale && discountPercentage > 0 && (
            <span className="bg-[#E31C23] text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider shadow-sm w-max rounded-sm">
              -{discountPercentage}%
            </span>
          )}
        </div>

        {/* Favorite Button */}
        {session?.user && (
          <button 
            onClick={toggleFavorite}
            className="absolute top-2 right-2 z-20 p-2 bg-white/70 dark:bg-black/50 backdrop-blur-md rounded-full text-[#1C1C1C] dark:text-white hover:text-[#E31C23] dark:hover:text-[#E31C23] transition-colors shadow-sm"
            aria-label="Agregar a favoritos"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorite ? "#E31C23" : "none"} stroke={isFavorite ? "#E31C23" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        )}
      </div>

      <div className="mt-2 text-left flex flex-col px-1">
        <Link href={href || "#"} className="block w-full" prefetch={false}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-[#4A4A4A] dark:text-gray-400">
            {brand}
          </p>
          <h3 className="text-sm font-bold uppercase text-[#1C1C1C] dark:text-white mb-1 line-clamp-1 leading-tight">
            {name}
          </h3>
        </Link>
        
        {/* Star Rating Mock */}
        <div className="flex items-center gap-0.5 mb-2">
          {[1,2,3,4,5].map(star => (
            <svg key={star} width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          ))}
          <span className="text-[9px] text-gray-500 ml-1">(12)</span>
        </div>

        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-1.5">
            {isOnSale && salePrice ? (
              <>
                <span className="text-sm font-bold text-[#1C1C1C] dark:text-white">
                  {formatPrice(Number(salePrice))}
                </span>
                <span className="text-[9px] md:text-[10px] text-gray-500 line-through">
                  {formatPrice(Number(price))}
                </span>
              </>
            ) : (
              <span className="text-sm font-bold text-[#1C1C1C] dark:text-white">
                {formatPrice(Number(price))}
              </span>
            )}
          </div>
          
          <button 
            disabled={!hasStock}
            className={`py-1.5 px-3 text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-colors duration-200 rounded-full shrink-0 ${
              hasStock 
                ? "bg-[#1C1C1C] text-white hover:bg-[#E31C23] dark:bg-white dark:text-black dark:hover:bg-gray-200"
                : "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-white/10 dark:text-gray-500"
            }`}
          >
            {hasStock ? "+ ADD" : "AGOTADO"}
          </button>
        </div>
      </div>
    </motion.article>
  )
}
