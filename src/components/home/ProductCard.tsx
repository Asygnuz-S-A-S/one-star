"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useSession } from "@/lib/auth-client"
import { useWishlistStore } from "@/store"
import { PLACEHOLDER_IMAGE_URL } from "@/lib/product-image"
import type { ColorPalette } from "@/lib/colors"
import type {
  ProductCardColorImageOption,
  ProductCardColorSummary,
} from "@/lib/product-card-colors"

const MAX_STARS = 5
const subscribeToHydration = () => () => undefined

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
  colorSummary?: ProductCardColorSummary
  colorPalette?: ColorPalette
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export default function ProductCard({ id, slug, name, brand, price, salePrice, imageUrl, secondaryImageUrl, gallery, isNew, isOnSale, hasStock = true, rating, reviewCount, priority = false, colorSummary }: ProductCardProps) {
  const href = slug ? `/productos/${slug}` : undefined
  const shouldReduceMotion = useReducedMotion()
  const router = useRouter()
  const { data: session } = useSession()
  // La sesión solo se conoce en el cliente. Este snapshot mantiene el HTML
  // inicial del servidor y del cliente alineados antes de mostrar favoritos.
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false)
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
  const baseFrames = hasRealImages ? realFrames : [PLACEHOLDER_IMAGE_URL]
  const familyColorFrames = (colorSummary?.options ?? []).flatMap((option) => option.imageUrls)
  const allFrames = [...new Set([...baseFrames, ...familyColorFrames])]
  const [activeFrame, setActiveFrame] = useState(0)
  const [activeColorName, setActiveColorName] = useState<string | null>(null)
  const imageFrameRef = useRef<HTMLDivElement | null>(null)
  const tiltRef = useRef<HTMLDivElement | null>(null)
  // Solo se anima el cambio de foto tras recorrerla con el cursor, no al cargar la página.
  const [scrubbed, setScrubbed] = useState(false)
  const imageColorOptions = (colorSummary?.imageOptions ?? []).filter((option) =>
    allFrames.includes(option.imageUrl)
  )

  /**
   * Con un color activo la secuencia se limita a las fotos de ese color: pasar
   * el cursor recorre solo ese modelo en vez de mezclar todos los colores.
   * Sin color activo se recorre la galería completa, como antes.
   */
  const frames = useMemo(() => {
    if (!activeColorName) return baseFrames
    const option = colorSummary?.options.find((item) => item.name === activeColorName)
    const colorFrames = (option?.imageUrls ?? []).filter((url) => allFrames.includes(url))
    return colorFrames.length > 0 ? colorFrames : baseFrames
    // `allFrames` se reconstruye en cada render; su contenido depende de estas props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeColorName, colorSummary, imageUrl, secondaryImageUrl, gallery])

  // Al cambiar de color el conjunto se acorta: el índice previo podría quedar fuera.
  const visibleFrame = Math.min(activeFrame, frames.length - 1)

  const handleMouseMoveSequence = (e: React.MouseEvent<HTMLElement>) => {
    if (frames.length <= 1) return
    const rect = imageFrameRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width))
    // Distribuir las N imágenes de forma uniforme a lo largo del ancho.
    // El color activo se conserva: recorrer la imagen no debe reintroducir
    // las fotos de los demás colores.
    const nextFrame = Math.floor(x * frames.length)
    // La dirección del cursor decide hacia dónde "gira" la foto que entra.
    if (nextFrame !== visibleFrame) {
      tiltRef.current?.style.setProperty("--frame-dir", nextFrame > visibleFrame ? "1" : "-1")
      setScrubbed(true)
    }
    setActiveFrame(nextFrame)
    // Giro leve en perspectiva que acompaña el cambio de foto: se percibe como rotar el tenis.
    if (!shouldReduceMotion) tiltRef.current?.style.setProperty("--card-ry", `${(x - 0.5) * 18}deg`)
  }

  const handleMouseEnterSequence = () => {
    setActiveColorName(null)
    setActiveFrame(0)
  }

  const handleMouseLeaveSequence = () => {
    setScrubbed(false)
    tiltRef.current?.style.setProperty("--card-ry", "0deg")
    setActiveColorName(null)
    setActiveFrame(0)
  }

  const handleCardBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      handleMouseLeaveSequence()
    }
  }

  const previewColorImage = (option: ProductCardColorImageOption) => {
    if (!allFrames.includes(option.imageUrl)) return

    // Al fijar el color, `frames` pasa a ser el de ese color y su primera
    // foto es justamente la de la miniatura.
    setActiveColorName(option.name)
    setActiveFrame(0)
  }

  return (
    <motion.article
      className="group cursor-pointer relative flex flex-col h-full rounded-store-md bg-store-surface p-2 transition-shadow duration-300 hover:shadow-[var(--store-elevation-raised)] dark:bg-[var(--store-surface)] dark:hover:bg-white/[0.03]"
      data-product-id={id}
      whileHover={shouldReduceMotion ? undefined : { y: -6 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.5, type: "spring", stiffness: 300, damping: 20 }}
      onMouseMove={handleMouseMoveSequence}
      onMouseEnter={handleMouseEnterSequence}
      onMouseLeave={handleMouseLeaveSequence}
      onBlur={handleCardBlur}
    >
      {/* Image container with 3D Sequence Sequence */}
      {href && <Link href={href} className="absolute inset-0 z-20" aria-label={name} />}
      <div 
        ref={imageFrameRef}
        data-testid="product-card-media"
        className="relative mb-3 aspect-square overflow-hidden rounded-store-sm bg-store-surface dark:bg-white/5"
      >
        <div ref={tiltRef} className="h-full w-full bg-inherit transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] [transform:perspective(900px)_rotateY(var(--card-ry,0deg))_scale(1.08)]">
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            {frames.map((src, index) => (
              <Image
                key={`frame-${index}`}
                src={src}
                alt={hasRealImages ? `${name} vista ${index + 1}` : `${name} — sin imagen disponible`}
                fill
                priority={priority && index === 0}
                // Conserva la foto completa; la escala compensa el aire propio de los
                // recortes de catálogo sin deformar el producto.
                className={`object-contain object-center ${
                  // El leve realce lleva a blanco puro los fondos casi blancos (≈246) de algunas fotos.
                  src === PLACEHOLDER_IMAGE_URL ? "" : "scale-[1.18] mix-blend-multiply brightness-[1.05] contrast-[1.05] dark:mix-blend-normal dark:filter-none"
                } ${index === visibleFrame ? `opacity-100 ${scrubbed ? "motion-safe:animate-[card-frame-in_280ms_cubic-bezier(.22,1,.36,1)]" : ""}` : "opacity-0"}`}
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            ))}
          </div>
        </div>

        {/* Top-Left Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {isNew && (
            <span className="bg-[#1C1C1C] text-white text-xs font-bold px-2 py-1 uppercase tracking-wider w-max rounded-full">
              NUEVO
            </span>
          )}
          {isOnSale && discountPercentage > 0 && (
            <span className="bg-[#E31C23] text-white text-xs font-bold px-2 py-1 uppercase tracking-wider w-max rounded-full">
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

        {/* Los colores flotan sobre la foto para que todas las tarjetas midan lo mismo. */}
        {href && imageColorOptions.length > 1 && (
          <div
            className="absolute inset-x-1.5 bottom-1.5 z-30 flex items-center gap-1 overflow-x-auto overscroll-x-contain scrollbar-hide"
            onMouseMove={(event) => event.stopPropagation()}
            role="group"
            aria-label={`Colores disponibles de ${name}`}
          >
            {imageColorOptions.map((option) => {
              const isActive = activeColorName
                ? activeColorName === option.name
                : frames[visibleFrame] === option.imageUrl

              // Enlace en vez de botón: al hacer clic se abre la ficha ya
              // posicionada en ese color. Pasar el cursor sigue mostrando la
              // vista previa sobre la tarjeta, sin salir del catálogo.
              return (
                <Link
                  key={option.name}
                  href={`/productos/${option.slug ?? slug}?color=${encodeURIComponent(option.name)}`}
                  prefetch={false}
                  className={`relative isolate h-9 w-9 shrink-0 overflow-hidden rounded-store-sm bg-white transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-[var(--store-action)] dark:bg-[#2a2a2a] ${
                    isActive ? "opacity-100" : "opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`Ver ${option.productName ?? name} en color ${option.name}`}
                  aria-current={isActive ? "true" : undefined}
                  title={option.name}
                  onPointerEnter={() => previewColorImage(option)}
                  onFocus={() => previewColorImage(option)}
                  // El clic navega por su cuenta; solo se frena la propagación
                  // para que no lo capture el enlace que cubre toda la tarjeta.
                  onClick={(event) => event.stopPropagation()}
                >
                  <Image
                    src={option.imageUrl}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-contain mix-blend-multiply brightness-[1.05] contrast-[1.05] dark:mix-blend-normal dark:filter-none"
                  />
                  {isActive && <span aria-hidden="true" className="absolute inset-x-1.5 bottom-0.5 z-10 h-0.5 rounded-full bg-[var(--store-action)]" />}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 text-left">
        {(() => {
          const info = (
            <>
              <p className="mb-0.5 flex items-baseline justify-between gap-2 text-xs font-bold uppercase tracking-wider text-[#4A4A4A] dark:text-gray-400">
                <span className="truncate">{brand}</span>
                {colorSummary?.label && colorSummary.total > 1 && (
                  <span className="shrink-0 font-montserrat font-medium normal-case tracking-normal text-[var(--store-muted)] dark:text-white/50">
                    {colorSummary.label}
                  </span>
                )}
              </p>
              <h3 className="mb-1 line-clamp-2 min-h-[2.5em] font-barlow text-sm font-semibold uppercase leading-tight text-[var(--store-ink)] dark:text-white">
                {name}
              </h3>
              <p
                data-testid="product-card-stock"
                className={`mb-1 inline-flex items-center gap-1 text-xs font-medium ${
                  hasStock ? "text-[var(--store-muted)] dark:text-white/60" : "text-[var(--store-action)]"
                }`}
              >
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${hasStock ? "bg-emerald-600" : "bg-[var(--store-action)]"}`} />
                {hasStock ? "Disponible" : "Agotado"}
              </p>
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

        <div className="mt-auto flex min-w-0 items-center justify-between gap-2 pt-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 leading-none">
            {isOnSale && salePrice ? (
              <>
                <span data-testid="product-card-price" className="text-base font-bold tracking-tight text-[var(--store-action)]">
                  {formatPrice(Number(salePrice))}
                </span>
                <span className="text-xs text-[var(--store-muted)] line-through">
                  {formatPrice(Number(price))}
                </span>
              </>
            ) : (
              <span data-testid="product-card-price" className="text-base font-bold tracking-tight text-[var(--store-ink)] dark:text-white">
                {formatPrice(Number(price))}
              </span>
            )}
          </div>

          {/* La talla se elige en la ficha: el botón compacto no compite con el precio en 2 columnas móviles. */}
          <button
            onClick={goToProduct}
            disabled={!hasStock || !href}
            aria-label={hasStock ? `Ver ${name} producto` : `${name} agotado`}
            className="relative z-20 inline-flex h-11 min-h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-transparent text-[var(--store-ink)] transition-colors duration-200 group-hover:bg-store-canvas hover:!bg-[var(--store-ink)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-white dark:group-hover:bg-white/10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </motion.article>
  )
}
