"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { useState, useEffect, useRef } from "react"
import { useSession } from "@/lib/auth-client"
import { useWishlistStore } from "@/store"
import { PLACEHOLDER_IMAGE_URL } from "@/lib/product-image"

const MAX_STARS = 5

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
  rating?: number
  reviewCount?: number
  priority?: boolean
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export default function ProductCard({ id, slug, name, brand, price, salePrice, imageUrl, secondaryImageUrl, gallery, isNew, isOnSale, hasStock = true, rating, reviewCount, priority = false }: ProductCardProps) {
  const href = slug ? `/productos/${slug}` : undefined
  const router = useRouter()
  const { data: session } = useSession()
  // La sesión solo se conoce en el cliente; renderizamos el botón de favoritos
  // tras montar para que el HTML del servidor y el del cliente coincidan
  // (evita el error de hidratación).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isFavorite = useWishlistStore((state) => state.productIds.includes(id))
  const toggleWishlist = useWishlistStore((state) => state.toggle)

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(id)
  }

  const goToProduct = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (href) router.push(href)
  }

  const hasRating = rating !== undefined && reviewCount !== undefined && reviewCount > 0
  const filledStars = hasRating ? Math.min(MAX_STARS, Math.max(0, Math.round(rating))) : 0

  const discountPercentage = isOnSale && salePrice && price > 0
    ? Math.round((1 - Number(salePrice) / Number(price)) * 100)
    : 0

  // 3D Sequence Logic — zonas dinámicas según cantidad de imágenes
  // Más ángulos = animación más fluida. Orden recomendado: izq → 3/4 izq → frente → 3/4 der → der
  const realFrames = [imageUrl, secondaryImageUrl, ...(gallery || [])].filter(Boolean) as string[]
  // Producto sin fotos: imagen predeterminada de la tienda en vez de un hueco.
  const hasRealImages = realFrames.length > 0
  const frames = hasRealImages ? realFrames : [PLACEHOLDER_IMAGE_URL]
  const [activeFrame, setActiveFrame] = useState(0)
  const imageFrameRef = useRef<HTMLDivElement | null>(null)

  const handleMouseMoveSequence = (e: React.MouseEvent<HTMLElement>) => {
    if (frames.length <= 1) return
    const rect = imageFrameRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width))
    // Distribuir las N imágenes de forma uniforme a lo largo del ancho
    const frameIndex = Math.floor(x * frames.length)
    setActiveFrame(frameIndex)
  }

  const handleMouseEnterSequence = () => {
    setActiveFrame(0)
  }

  const handleMouseLeaveSequence = () => {
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
      onMouseMove={handleMouseMoveSequence}
      onMouseEnter={handleMouseEnterSequence}
      onMouseLeave={handleMouseLeaveSequence}
    >
      {/* Image container with 3D Sequence Sequence */}
      {href && <Link href={href} className="absolute inset-0 z-20" aria-label={name} />}
      <div 
        ref={imageFrameRef}
        className="relative aspect-[3/4] bg-[#F5F5F5] dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 overflow-hidden mb-4 rounded-xl shadow-sm transition-shadow duration-300 group-hover:shadow-2xl"
      >
        <div className="w-full h-full">
          {/* Subtle overlay gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none rounded-xl" />
          
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            {frames.map((src, index) => (
              <Image
                key={`frame-${index}`}
                src={src}
                alt={hasRealImages ? `${name} vista ${index + 1}` : `${name} — sin imagen disponible`}
                fill
                priority={priority && index === 0}
                className={`object-center transition-opacity duration-150 ease-in-out ${
                  hasRealImages ? "object-cover" : "object-contain"
                } ${index === activeFrame ? "opacity-100" : "opacity-0"}`}
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            ))}
          </div>
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
        {mounted && session?.user && (
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
        {(() => {
          const info = (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-[#4A4A4A] dark:text-gray-400">
                {brand}
              </p>
              <h3 className="text-sm font-bold uppercase text-[#1C1C1C] dark:text-white mb-1 line-clamp-1 leading-tight">
                {name}
              </h3>
            </>
          )
          return href ? (
            <Link href={href} className="block w-full" prefetch={false}>
              {info}
            </Link>
          ) : (
            <div className="block w-full">{info}</div>
          )
        })()}

        {hasRating && (
          <div className="flex items-center gap-0.5 mb-2" aria-label={`Calificación: ${rating} de ${MAX_STARS}`}>
            {Array.from({ length: MAX_STARS }, (_, i) => (
              <svg
                key={i}
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill={i < filledStars ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={i < filledStars ? 0 : 1.5}
                className="text-yellow-400"
                aria-hidden="true"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ))}
            <span className="text-[9px] text-gray-500 ml-1">({reviewCount})</span>
          </div>
        )}

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
          
          {/* La talla se elige en la ficha, así que el botón navega al detalle */}
          <button
            onClick={goToProduct}
            disabled={!hasStock || !href}
            aria-label={hasStock ? `Ver ${name}` : `${name} agotado`}
            className={`relative z-20 py-1.5 px-3 text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-colors duration-200 rounded-full shrink-0 ${
              hasStock && href
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
