"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react"
import Image, { getImageProps } from "next/image"

import { PublicButton } from "@/components/storefront/public-primitives"
import { resolveCampaignSlides, type CampaignHeroConfig, type CampaignHeroSlide } from "@/lib/editorial-config"
import { canUseNextImageOptimization } from "@/lib/image-optimization"

// Móvil: el texto va abajo, así que el velo sube desde abajo; desde md el texto va a la izquierda.
const ACCENT_CLASSES = {
  light: "from-white/95 via-white/70 to-white/0",
  carbon: "from-black/90 via-black/55 to-black/0",
  oneStarRed: "from-[#651116]/95 via-[#1c1c1c]/70 to-black/0",
} as const

// El color del texto va en el contenedor del texto: en el velo no se heredaba y el titular salía negro sobre foto oscura.
const ACCENT_TEXT = {
  light: "text-[var(--store-ink)]",
  carbon: "text-white",
  oneStarRed: "text-white",
} as const

function CampaignMedia({ slide, priority }: { slide: CampaignHeroSlide; priority: boolean }) {
  const [mediaFailed, setMediaFailed] = useState(false)
  const mobileMedia = slide.mobileMedia ?? slide.tabletMedia ?? slide.desktopMedia
  const tabletMedia = slide.tabletMedia ?? slide.desktopMedia ?? mobileMedia
  const desktopMedia = slide.desktopMedia ?? slide.tabletMedia ?? mobileMedia
  const imageProps = (media: NonNullable<typeof mobileMedia>, width: number, height: number) => getImageProps({
    src: media.src, alt: media.alt, width, height, sizes: "100vw", fetchPriority: priority ? "high" : "low",
    unoptimized: !canUseNextImageOptimization(media.src),
  }).props
  const mobileImageProps = mobileMedia ? imageProps(mobileMedia, 750, 1000) : null
  const tabletImageProps = tabletMedia ? imageProps(tabletMedia, 1280, 960) : null
  const desktopImageProps = desktopMedia ? imageProps(desktopMedia, 1920, 1080) : null

  return mobileImageProps && !mediaFailed ? <picture className="hero-parallax absolute inset-0 -z-20" data-testid="editorial-hero-media">
    {desktopImageProps && <source media="(min-width: 1024px)" srcSet={desktopImageProps.srcSet} />}
    {tabletImageProps && <source media="(min-width: 641px)" srcSet={tabletImageProps.srcSet} />}
    <img {...mobileImageProps} alt={mobileMedia?.alt ?? ""} loading={priority ? "eager" : "lazy"} className="h-full w-full object-cover" onError={() => setMediaFailed(true)} />
  </picture> : <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_40%,#4a4a4a_0,transparent_28%),linear-gradient(135deg,#1c1c1c,#2b2b2b_55%,#e31c23_180%)]" data-testid="editorial-hero-fallback" role="img" aria-label="Campaña One Star" />
}

const STAGE_BACKGROUNDS = {
  light: "bg-[radial-gradient(ellipse_at_70%_45%,#ffffff_0%,var(--store-canvas)_55%,#e4e4e1_100%)]",
  carbon: "bg-[radial-gradient(ellipse_at_70%_45%,#3a3a3a_0%,#1c1c1c_60%,#111_100%)]",
  oneStarRed: "bg-[radial-gradient(ellipse_at_70%_45%,#8a1a1f_0%,#3b0d10_60%,#1c1c1c_100%)]",
} as const

const AUTOPLAY_MS = 6500

const isStageSlide = (slide: CampaignHeroSlide) => Boolean(slide.foregroundMedia) && !slide.mobileMedia && !slide.tabletMedia && !slide.desktopMedia

/** Fondo de un slide. Todos quedan apilados y solo cambia la opacidad: eso hace el crossfade. */
function SlideBackdrop({ slide, active, priority, instant = false }: { slide: CampaignHeroSlide; active: boolean; priority: boolean; instant?: boolean }) {
  const stage = isStageSlide(slide)
  return <div aria-hidden={!active} className={`absolute inset-0 isolate ${instant ? "" : "transition-opacity duration-700 ease-out"} ${active ? "opacity-100" : "opacity-0"} ${stage ? STAGE_BACKGROUNDS[slide.accent] : ""}`}>
    {!stage && <CampaignMedia slide={slide} priority={priority} />}
    {!stage && <div className={`absolute inset-0 -z-10 bg-gradient-to-t md:bg-gradient-to-r ${ACCENT_CLASSES[slide.accent]}`} />}
    {!stage && slide.foregroundMedia && <div className="pointer-events-none absolute inset-x-0 top-12 z-0 h-[42%] sm:top-auto sm:bottom-0 sm:left-[38%] sm:h-[72%]" data-testid="editorial-hero-foreground">
      <Image src={slide.foregroundMedia.src} alt={slide.foregroundMedia.alt} fill priority={priority} sizes="(max-width: 640px) 100vw, 62vw" unoptimized={!canUseNextImageOptimization(slide.foregroundMedia.src)} className="object-contain object-right-bottom drop-shadow-[0_28px_25px_rgba(0,0,0,0.35)]" />
    </div>}
    {!stage && <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true"><span className="absolute right-[-0.12em] top-1/2 -translate-y-1/2 font-barlow text-[31vw] font-black leading-none tracking-[-0.12em] text-white/10">ONE</span></div>}
  </div>
}

// Giros pequeños a propósito: más de ~10° en Y deja ver que la foto es plana.
const WATERMARK_DEPTH: CSSProperties = { transform: "translate3d(calc(var(--px, 0) * -28px), calc(-50% + var(--py, 0) * -14px), 0)" }
const PRODUCT_DEPTH: CSSProperties = { transform: "translate3d(calc(var(--px, 0) * 22px), calc(var(--py, 0) * 12px), 0) rotateY(calc(var(--px, 0) * 10deg)) rotateX(calc(var(--py, 0) * -6deg))" }
const SHADOW_DEPTH: CSSProperties = { transform: "translate3d(calc(var(--px, 0) * 14px), 0, 0)" }

const SPIN_MIN_FRAMES = 8
const SPIN_LOOP_MS = 7000
/** Píxeles de arrastre por cuadro: con 72 cuadros, una vuelta completa ≈ 290 px. */
const SPIN_DRAG_PX = 4
// El giro usa cuadros recortados al zapato, así que puede ocupar más que la foto suelta.
const SPIN_IMAGE_CLASSES = "h-auto w-full max-w-[min(96%,720px)] max-h-[min(34svh,300px)] object-contain lg:max-h-[min(54svh,470px)] drop-shadow-[0_28px_22px_rgba(0,0,0,0.22)]"
const PRODUCT_IMAGE_CLASSES = "h-auto max-h-[min(26svh,240px)] w-auto max-w-[min(88%,560px)] object-contain lg:max-h-[min(46svh,420px)] drop-shadow-[0_28px_22px_rgba(0,0,0,0.22)]"

/** Producto recortado (PNG sin fondo) flotando sobre una palabra gigante: el "key visual" de lanzamientos. */
function ProductStage({ slide }: { slide: CampaignHeroSlide }) {
  const mode = slide.spinMode ?? "auto"
  const frames = [slide.foregroundMedia, ...(mode === "static" ? [] : slide.angles ?? [])].filter((item): item is NonNullable<typeof slide.foregroundMedia> => Boolean(item))
  const unique = frames.filter((frame, index) => frames.findIndex((item) => item.src === frame.src) === index)
  const frameKey = unique.map((frame) => frame.src).join("|")
  const [frameIndex, setFrameIndex] = useState(0)
  // Con muchos ángulos es un giro 360: una vuelta cada SPIN_LOOP_MS en vez de pasar foto por foto.
  const isSpin = unique.length >= SPIN_MIN_FRAMES
  // Arrastrar con mouse o dedo gira el zapato; al soltar sigue el giro automático.
  const drag = useRef<{ x: number; frame: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const spinTo = (frame: number) => setFrameIndex(((frame % unique.length) + unique.length) % unique.length)
  useEffect(() => {
    if (unique.length < 2 || dragging || (isSpin && mode === "mouse") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const stepMs = isSpin ? Math.max(40, Math.round(SPIN_LOOP_MS / unique.length)) : 1400
    const timer = window.setInterval(() => setFrameIndex((current) => (current + 1) % unique.length), stepMs)
    return () => window.clearInterval(timer)
  }, [frameKey, unique.length, isSpin, dragging, mode])
  const media = unique[frameIndex] ?? slide.foregroundMedia!
  const watermark = slide.headline.split(/\s+/)[0] ?? slide.headline
  const isLight = slide.accent === "light"

  const stageRef = useRef<HTMLDivElement>(null)
  const parallax = useParallax(stageRef)

  // La altura la fija el hero; el producto se adapta al espacio disponible para que todos los slides midan igual.
  // --px/--py van de -0.5 a 0.5: el tenis y la palabra de fondo se mueven en sentidos opuestos (profundidad).
  return <div ref={stageRef} className="relative flex h-full min-h-0 flex-col items-center justify-center [perspective:1200px]" data-testid="editorial-hero-stage" onPointerMove={parallax.move} onPointerLeave={parallax.reset}>
    <span aria-hidden="true" style={WATERMARK_DEPTH} className={`pointer-events-none absolute inset-x-0 top-1/2 select-none text-center font-barlow text-[clamp(5rem,30vw,16rem)] font-black uppercase leading-none tracking-[-0.06em] ${isLight ? "text-store-ink/[0.07]" : "text-white/[0.08]"}`}>{watermark}</span>
    <div style={PRODUCT_DEPTH} className="relative flex w-full items-center justify-center">
      <div className="flex w-full items-center justify-center motion-safe:animate-[hero-levitate_6s_ease-in-out_infinite]">
        {isSpin
          // Cuadros apilados y ya cargados: cambiar solo la opacidad evita parpadeos y la animación de entrada en cada cuadro.
          ? <div
            className={`grid w-full touch-pan-y select-none place-items-center outline-none motion-safe:animate-[hero-product-enter_900ms_cubic-bezier(.22,1,.36,1)_both] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            data-testid="editorial-hero-spin"
            role="slider"
            tabIndex={0}
            aria-label="Girar el producto: arrastra o usa las flechas"
            aria-valuemin={0}
            aria-valuemax={unique.length - 1}
            aria-valuenow={frameIndex}
            onPointerDown={(event) => { drag.current = { x: event.clientX, frame: frameIndex }; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId) }}
            onPointerMove={(event) => {
              if (drag.current) return spinTo(drag.current.frame + Math.round((event.clientX - drag.current.x) / SPIN_DRAG_PX))
              // Modo mouse: la posición horizontal del puntero sobre el zapato elige el ángulo (sin hacer clic).
              if (mode === "mouse" && event.pointerType === "mouse") {
                const box = event.currentTarget.getBoundingClientRect()
                spinTo(Math.floor(((event.clientX - box.left) / box.width) * unique.length))
              }
            }}
            onPointerUp={() => { drag.current = null; setDragging(false) }}
            onPointerCancel={() => { drag.current = null; setDragging(false) }}
            onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); spinTo(frameIndex + (event.key === "ArrowRight" ? 1 : -1)) } }}
          >
            {unique.map((frame, index) => <Image key={frame.src} src={frame.src} alt={index === 0 ? frame.alt : ""} aria-hidden={index === 0 ? undefined : true} width={1120} height={720} priority={index === 0} loading={index === 0 ? undefined : "eager"} sizes="(max-width: 1024px) 96vw, 720px" unoptimized={!canUseNextImageOptimization(frame.src)} draggable={false} className={`[grid-area:1/1] ${SPIN_IMAGE_CLASSES} ${index === frameIndex ? "opacity-100" : "opacity-0"}`} />)}
          </div>
          : <Image key={media.src} src={media.src} alt={media.alt} width={1120} height={720} priority sizes="(max-width: 1024px) 88vw, 560px" unoptimized={!canUseNextImageOptimization(media.src)} className={`${PRODUCT_IMAGE_CLASSES} motion-safe:animate-[hero-product-enter_900ms_cubic-bezier(.22,1,.36,1)_both]`} />}
      </div>
    </div>
    <div aria-hidden="true" style={SHADOW_DEPTH} className="-mt-2 h-6 w-[42%] max-w-sm shrink-0 blur-xl">
      <div className={`h-full w-full rounded-[50%] motion-safe:animate-[hero-levitate-shadow_6s_ease-in-out_infinite] ${isLight ? "bg-black/30" : "bg-black/70"}`} />
    </div>
  </div>
}

/**
 * Parallax suavizado con requestAnimationFrame: el valor persigue al puntero con inercia, así
 * no hay saltos al entrar o salir del área. Solo con mouse y sin movimiento reducido.
 */
function useParallax(ref: RefObject<HTMLDivElement | null>) {
  const target = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })
  const frame = useRef<number | null>(null)

  const start = useCallback(() => {
    if (frame.current !== null) return
    const step = () => {
      const c = current.current
      const t = target.current
      c.x += (t.x - c.x) * 0.08
      c.y += (t.y - c.y) * 0.08
      ref.current?.style.setProperty("--px", c.x.toFixed(4))
      ref.current?.style.setProperty("--py", c.y.toFixed(4))
      frame.current = Math.abs(t.x - c.x) + Math.abs(t.y - c.y) > 0.001 ? requestAnimationFrame(step) : null
    }
    frame.current = requestAnimationFrame(step)
  }, [ref])

  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current) }, [])

  return {
    move: (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return
      const rect = event.currentTarget.getBoundingClientRect()
      target.current = { x: (event.clientX - rect.left) / rect.width - 0.5, y: (event.clientY - rect.top) / rect.height - 0.5 }
      start()
    },
    reset: () => { target.current = { x: 0, y: 0 }; start() },
  }
}

export default function EditorialCampaignHero({ campaign }: { campaign: CampaignHeroConfig }) {
  const slides = useMemo(() => resolveCampaignSlides(campaign), [campaign])
  const [current, setCurrent] = useState(0)
  const [changed, setChanged] = useState(false)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [shift, setShift] = useState(0)
  const [live, setLive] = useState(false)
  const gesture = useRef<{ id: number; x: number; lastX: number; lastT: number; width: number } | null>(null)
  const currentIndex = Math.min(current, slides.length - 1)
  const slide = slides[currentIndex]
  const multipleSlides = slides.length > 1
  const goTo = useCallback((index: number) => { setChanged(true); setCurrent((index + slides.length) % slides.length) }, [slides.length])

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReducedMotion(query.matches)
    sync(); query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])
  useEffect(() => {
    if (!multipleSlides || reducedMotion || paused) return
    const id = window.setTimeout(() => goTo(currentIndex + 1), AUTOPLAY_MS)
    return () => window.clearTimeout(id)
  }, [currentIndex, goTo, multipleSlides, reducedMotion, paused])

  const isStage = isStageSlide(slide)
  const controlTone = slide.accent === "light" ? "text-store-ink" : "text-white"

  return <section
    className="relative isolate h-[clamp(520px,calc(100svh-var(--public-header-offset,56px)-7rem),720px)] overflow-hidden bg-store-canvas lg:h-[clamp(560px,calc(100svh-var(--public-header-offset-desktop,64px)-3rem),760px)]"
    data-testid="editorial-campaign-hero" role="region" aria-roledescription={multipleSlides ? "carousel" : undefined}
    aria-label={multipleSlides ? "Campañas destacadas" : "Campaña destacada"}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
    onPointerDown={(event) => {
      if (!multipleSlides || (event.target as HTMLElement).closest("a,button")) return
      gesture.current = { id: event.pointerId, x: event.clientX, lastX: event.clientX, lastT: event.timeStamp, width: event.currentTarget.clientWidth }
    }}
    onPointerMove={(event) => {
      const drag = gesture.current
      if (!drag || drag.id !== event.pointerId) return
      const dx = event.clientX - drag.x
      if (Math.abs(dx) > 8) event.currentTarget.setPointerCapture(event.pointerId)
      drag.lastX = event.clientX
      drag.lastT = event.timeStamp
      setPaused(true)
      if (reducedMotion) return
      setLive(true)
      setShift(dx)
    }}
    onPointerUp={(event) => {
      const drag = gesture.current
      if (!drag || drag.id !== event.pointerId) return
      gesture.current = null
      const dx = event.clientX - drag.x
      const dt = Math.max(16, event.timeStamp - drag.lastT)
      const velocity = ((event.clientX - drag.lastX) / dt) * 1000
      const projected = dx + velocity * 0.22
      const width = drag.width || 1
      if (reducedMotion) {
        if (Math.abs(dx) > 48) goTo(dx < 0 ? currentIndex + 1 : currentIndex - 1)
        setLive(false)
        setShift(0)
        return
      }
      const dir = projected < -width * 0.18 ? 1 : projected > width * 0.18 ? -1 : 0
      setLive(false)
      setShift(dir === 0 ? 0 : dir * -width)
      window.setTimeout(() => {
        if (dir !== 0) goTo(currentIndex + dir)
        setShift(0)
      }, 260)
    }}
    onPointerCancel={() => { gesture.current = null; setLive(false); setShift(0) }}
  >
    <div className="absolute inset-0 overflow-hidden">
      {slides.map((item, index) => {
        const count = slides.length
        let place = index - currentIndex
        if (place > count / 2) place -= count
        if (place < -count / 2) place += count
        if (count === 2 && place !== 0) place = shift < -1 ? 1 : shift > 1 ? -1 : 1
        if (Math.abs(place) > 1) return null
        return (
          <div key={item.id} className="absolute inset-0" style={{ transform: `translate3d(calc(${place * 100}% + ${shift}px), 0, 0)`, transition: live ? "none" : "transform 260ms cubic-bezier(.22,1,.36,1)" }}>
            <SlideBackdrop slide={item} active priority={index === 0} instant />
          </div>
        )
      })}
    </div>

    {/* El contenido se re-monta por slide; solo anima opacidad tras el primer cambio para no retrasar el primer pintado. */}
    <div key={slide.id} style={{ transform: `translate3d(${shift}px, 0, 0)`, transition: live ? "none" : "transform 260ms cubic-bezier(.22,1,.36,1)" }} className={`hero-scroll-out relative z-10 mx-auto flex h-full max-w-7xl px-4 sm:px-8 md:px-12 lg:px-16 ${isStage ? "flex-col justify-end gap-4 pb-16 pt-4 lg:flex-row-reverse lg:items-center lg:gap-10 lg:pb-16" : "items-end pb-16 pt-20 md:items-center"}`}>
      {isStage && <div className="min-h-0 flex-1 lg:h-full"><ProductStage slide={slide} /></div>}
      <div className={`min-w-0 max-w-2xl ${isStage ? "shrink-0 lg:flex-1" : ""} ${ACCENT_TEXT[slide.accent]} ${changed ? "motion-safe:animate-[hero-copy-swap_650ms_cubic-bezier(.22,1,.36,1)_both]" : "motion-safe:animate-[editorial-copy-in_600ms_cubic-bezier(.22,1,.36,1)_both]"}`} aria-live="polite">
        {slide.eyebrow && <p className="mb-3 font-barlow text-xs font-bold uppercase tracking-[0.18em] text-[var(--store-action)] md:mb-4">{slide.eyebrow}</p>}
        <h1 className="font-barlow text-[clamp(2.5rem,12vw,4rem)] font-black uppercase leading-[0.9] tracking-[-0.03em] [overflow-wrap:anywhere] sm:text-6xl md:text-8xl">{slide.headline}</h1>
        {slide.copy && <p className="mt-4 line-clamp-3 max-w-xl text-base leading-relaxed opacity-90 md:mt-5 md:text-lg">{slide.copy}</p>}
        <div className="mt-6 flex flex-wrap gap-3 md:mt-8"><PublicButton href={slide.primaryCta.href}>{slide.primaryCta.label}</PublicButton>{slide.secondaryCta && <PublicButton href={slide.secondaryCta.href} variant="outline" className="border-current bg-white/5 text-current hover:bg-white/15">{slide.secondaryCta.label}</PublicButton>}</div>
      </div>
    </div>

    {multipleSlides && <div className={`absolute inset-x-4 bottom-3 z-20 flex items-center justify-between sm:inset-x-8 md:inset-x-12 lg:inset-x-16 ${controlTone}`} aria-label="Controles del carrusel">
      <div className="flex items-center" role="tablist" aria-label="Seleccionar campaña">
        {slides.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={index === currentIndex} onClick={() => goTo(index)} className="group grid h-11 min-w-11 place-items-center px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current" aria-label={`Ir al slide ${index + 1}: ${item.headline}`}>
          <span className={`relative block h-0.5 overflow-hidden rounded-full bg-current/25 transition-[width] duration-300 ${index === currentIndex ? "w-10" : "w-5 group-hover:bg-current/50"}`}>
            {index === currentIndex && <span key={`${item.id}-${currentIndex}`} className="absolute inset-y-0 left-0 w-full origin-left bg-current motion-safe:animate-[hero-progress_linear_both]" style={{ animationDuration: `${AUTOPLAY_MS}ms`, animationPlayState: paused ? "paused" : "running" }} />}
          </span>
        </button>)}
        <span className="ml-2 font-barlow text-[11px] font-semibold tabular-nums tracking-[0.12em] opacity-70" aria-hidden="true">{String(currentIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
      </div>
      <div className="hidden items-center sm:flex">
        <button type="button" onClick={() => goTo(currentIndex - 1)} className="grid h-11 w-11 place-items-center opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current" aria-label="Anterior">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button type="button" onClick={() => goTo(currentIndex + 1)} className="grid h-11 w-11 place-items-center opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current" aria-label="Siguiente">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>}
  </section>
}
