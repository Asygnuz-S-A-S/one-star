"use client"

import { useRouter, usePathname } from "next/navigation"
import { GENDER_FILTER_OPTIONS } from "@/lib/gender-filter"
import { DEFAULT_PRODUCT_SORT, PRODUCT_SORT_OPTIONS } from "@/lib/product-sort"
import { useEffect, useRef, useState } from "react"
import {
  buildPriceFilterSearch,
  normalizePriceBounds,
  normalizePriceSelection,
  priceRangeStep,
  type PriceBounds,
} from "@/lib/price-range"
import { PRODUCT_COLORS, getColorSwatchStyle, isRealColor, type ColorPalette } from "@/lib/colors"

interface FilterSidebarProps {
  brands: string[]
  sizes: string[]
  colors: string[]
  currentParams: string
  priceBounds: { min: number | null; max: number | null }
  /** Paleta administrable; si no llega se usa la de respaldo. */
  colorPalette?: ColorPalette
}

// Clases reutilizables con dark mode
const sectionSummary =
  "cursor-pointer font-barlow font-bold uppercase text-xs tracking-widest " +
  "text-[#1C1C1C] dark:text-white/80 py-3 border-b border-[#E0E0E0] dark:border-white/10 " +
  "select-none list-none flex justify-between items-center"

const chevron = "text-[#4A4A4A] dark:text-white/40"

const optionText = "font-montserrat text-sm text-[#4A4A4A] dark:text-white/60"

export default function FilterSidebar({
  brands,
  sizes,
  colors,
  currentParams: currentParamsString,
  priceBounds: rawPriceBounds,
  colorPalette,
}: FilterSidebarProps) {
  const palette =
    colorPalette && Object.keys(colorPalette).length > 0 ? colorPalette : PRODUCT_COLORS
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const closeFilters = () => {
    setIsOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFilters()
        return
      }
      if (event.key !== "Tab") return

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), summary, select:not([disabled]), textarea:not([disabled])'
        ) ?? []
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    dialogRef.current?.querySelector<HTMLElement>("button, input, summary")?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen])

  const currentParams = new URLSearchParams(currentParamsString)
  const priceBounds = normalizePriceBounds(rawPriceBounds)
  const priceSelectionFromParams = (bounds: PriceBounds) =>
    normalizePriceSelection(
      {
        min: Number(currentParams.get("precio_min")) || bounds.min,
        max: Number(currentParams.get("precio_max")) || bounds.max,
      },
      bounds,
    )
  const [priceSelection, setPriceSelection] = useState<PriceBounds>(() =>
    priceBounds ? priceSelectionFromParams(priceBounds) : { min: 0, max: 0 },
  )


  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(currentParams.toString())
    if (next.get(key) === value) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    next.delete("page")
    router.push(`${pathname}?${next.toString()}`)
  }

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(currentParams.toString())
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    next.delete("page")
    router.push(`${pathname}?${next.toString()}`)
  }

  const applyPrecio = () => {
    if (!priceBounds) return
    const next = buildPriceFilterSearch(currentParams.toString(), priceBounds, priceSelection)
    const query = next.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const clearAll = () => {
    if (priceBounds) setPriceSelection(priceBounds)
    router.push(pathname)
  }

  const [showAllSizes, setShowAllSizes] = useState(false)
  const [showAllColors, setShowAllColors] = useState(false)
  const currentOrden = currentParams.get("orden") ?? DEFAULT_PRODUCT_SORT
  const currentMarca = currentParams.get("marca") ?? ""
  const currentGenero = currentParams.get("genero") ?? ""
  const currentTalla = currentParams.get("talla") ?? ""
  const currentColor = currentParams.get("color") ?? ""

  const allSizes = sizes.length > 0
    ? sizes
    : ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"]

  // Solo colores reales: descarta marcadores como "N/A" de variantes sin color.
  const realColors = colors.filter(isRealColor)
  const allColors = realColors.length > 0 ? realColors : Object.keys(palette)
  // Listas largas plegadas: el filtro activo siempre queda a la vista.
  const SIZE_PREVIEW = 16
  const COLOR_PREVIEW = 8
  const visibleSizes = showAllSizes || allSizes.length <= SIZE_PREVIEW
    ? allSizes
    : [...allSizes.slice(0, SIZE_PREVIEW), ...(currentTalla && allSizes.indexOf(currentTalla) >= SIZE_PREVIEW ? [currentTalla] : [])]
  const visibleColors = showAllColors || allColors.length <= COLOR_PREVIEW
    ? allColors
    : [...allColors.slice(0, COLOR_PREVIEW), ...(currentColor && allColors.indexOf(currentColor) >= COLOR_PREVIEW ? [currentColor] : [])]
  const moreButton = "mt-3 font-montserrat text-xs font-semibold text-[#1C1C1C] underline underline-offset-4 hover:text-[#E31C23] dark:text-white"

  const sidebarContent = (
    <div className="flex flex-col gap-4">
      {/* Ordenar por */}
      <details open>
        <summary className={sectionSummary}>
          Ordenar por
          <span className={chevron}>▾</span>
        </summary>
        <div className="pt-3 flex flex-col gap-2">
          {PRODUCT_SORT_OPTIONS.map(({ label, value }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="orden"
                value={value}
                checked={currentOrden === value}
                onChange={() => setParam("orden", value)}
                className="accent-[#1C1C1C] dark:accent-white"
              />
              <span className={optionText}>{label}</span>
            </label>
          ))}
        </div>
      </details>

      {/* Precio */}
      <details open>
        <summary className={sectionSummary}>
          Precio
          <span className={chevron}>▾</span>
        </summary>
        <div className="pt-3 flex flex-col gap-3">
          {priceBounds ? (
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Rango de precio</legend>
              <p className={`${optionText} font-medium`} aria-live="polite">
                ${priceSelection.min.toLocaleString("es-CO")} — ${priceSelection.max.toLocaleString("es-CO")}
              </p>
              <label className={`${optionText} flex flex-col gap-1`}>
                Desde <span className="sr-only">${priceSelection.min.toLocaleString("es-CO")}</span>
                <input
                  type="range"
                  aria-label="Precio mínimo"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={priceRangeStep(priceBounds)}
                  value={priceSelection.min}
                  onChange={(event) => setPriceSelection((selection) => ({
                    ...selection,
                    min: Math.min(Number(event.target.value), selection.max),
                  }))}
                  className="h-11 w-full accent-[#1C1C1C] dark:accent-white"
                />
              </label>
              <label className={`${optionText} flex flex-col gap-1`}>
                Hasta <span className="sr-only">${priceSelection.max.toLocaleString("es-CO")}</span>
                <input
                  type="range"
                  aria-label="Precio máximo"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={priceRangeStep(priceBounds)}
                  value={priceSelection.max}
                  onChange={(event) => setPriceSelection((selection) => ({
                    ...selection,
                    max: Math.max(Number(event.target.value), selection.min),
                  }))}
                  className="h-11 w-full accent-[#1C1C1C] dark:accent-white"
                />
              </label>
              <button
                type="button"
                onClick={applyPrecio}
                className="bg-[#1C1C1C] dark:bg-white text-white dark:text-black font-barlow font-bold uppercase text-xs tracking-widest py-3 px-4 hover:bg-[#4A4A4A] dark:hover:bg-white/80 transition-colors"
              >
                Aplicar
              </button>
            </fieldset>
          ) : (
            <p className={optionText}>No hay precios disponibles para filtrar.</p>
          )}
        </div>
      </details>

      {/* Género */}
      <details open>
        <summary className={sectionSummary}>
          Género
          <span className={chevron}>▾</span>
        </summary>
        <div className="pt-3 flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="genero"
              value=""
              checked={currentGenero === ""}
              onChange={() => setParam("genero", "")}
              className="accent-[#1C1C1C] dark:accent-white"
            />
            <span className={optionText}>Todos</span>
          </label>
          {GENDER_FILTER_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="genero"
                value={value}
                checked={currentGenero === value}
                onChange={() => setParam("genero", value)}
                className="accent-[#1C1C1C] dark:accent-white"
              />
              <span className={optionText}>{label}</span>
            </label>
          ))}
        </div>
      </details>

      {/* Marca */}
      {brands.length > 0 && (
        <details open>
          <summary className={sectionSummary}>
            Marca
            <span className={chevron}>▾</span>
          </summary>
          <div className="pt-3 flex flex-col gap-2">
            {brands.map((brand) => (
              <label key={brand} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentMarca === brand}
                  onChange={() => updateParam("marca", brand)}
                  className="accent-[#1C1C1C] dark:accent-white"
                />
                <span className={optionText}>{brand}</span>
              </label>
            ))}
          </div>
        </details>
      )}

      {/* Talla */}
      <details open>
        <summary className={sectionSummary}>
          Talla
          <span className={chevron}>▾</span>
        </summary>
        <div className="pt-3 grid grid-cols-4 gap-2">
          {visibleSizes.map((size) => (
            <button
              key={size}
              onClick={() => updateParam("talla", size)}
              aria-pressed={currentTalla === size}
              className={`min-h-9 rounded-[var(--store-radius-sm)] border text-xs font-montserrat font-medium transition-colors ${
                currentTalla === size
                  ? "bg-[#1C1C1C] dark:bg-white text-white dark:text-black border-[#1C1C1C] dark:border-white"
                  : "border-[#E0E0E0] dark:border-white/15 text-[#4A4A4A] dark:text-white/55 hover:border-[#1C1C1C] dark:hover:border-white/40"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        {allSizes.length > SIZE_PREVIEW && (
          <button type="button" onClick={() => setShowAllSizes((value) => !value)} className={moreButton}>
            {showAllSizes ? "Ver menos tallas" : `Ver todas las tallas (${allSizes.length})`}
          </button>
        )}
      </details>

      {/* Color */}
      <details open>
        <summary className={sectionSummary}>
          Color
          <span className={chevron}>▾</span>
        </summary>
        <div className="pt-3 flex flex-col gap-2">
          {visibleColors.map((color) => {
            const isActive = currentColor === color
            return (
              <button
                key={color}
                onClick={() => updateParam("color", color)}
                aria-pressed={isActive}
                className="flex items-center gap-2 text-left group"
              >
                <span
                  className={`w-6 h-6 shrink-0 rounded-full transition-all ${
                    isActive
                      ? "ring-2 ring-offset-1 ring-[#1C1C1C] dark:ring-white dark:ring-offset-black"
                      : "ring-1 ring-[#E0E0E0] dark:ring-white/20 group-hover:ring-[#1C1C1C] dark:group-hover:ring-white/50"
                  }`}
                  style={getColorSwatchStyle(color, palette)}
                  aria-hidden
                />
                <span
                  className={`${optionText} ${
                    isActive ? "font-semibold text-[#1C1C1C] dark:text-white" : ""
                  }`}
                >
                  <span className="capitalize">{color.toLocaleLowerCase("es")}</span>
                </span>
              </button>
            )
          })}
        </div>
        {allColors.length > COLOR_PREVIEW && (
          <button type="button" onClick={() => setShowAllColors((value) => !value)} className={moreButton}>
            {showAllColors ? "Ver menos colores" : `Ver todos los colores (${allColors.length})`}
          </button>
        )}
      </details>

      {/* Limpiar filtros */}
      <button
        onClick={clearAll}
        className="mt-4 text-xs font-montserrat text-[#4A4A4A] dark:text-white/40 underline underline-offset-2 hover:text-[#1C1C1C] dark:hover:text-white/70 text-left transition-colors"
      >
        Limpiar filtros
      </button>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block">{sidebarContent}</div>

      {/* Móvil: botón flotante + drawer */}
      <div className="lg:hidden">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls="filter-dialog"
          className="fixed bottom-[6.5rem] left-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--store-action)] px-5 font-barlow text-sm font-bold uppercase tracking-widest text-white shadow-[0_10px_24px_rgb(227_28_35/0.35)]"
        >
          Filtros
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-[60] bg-black/40" onClick={closeFilters} aria-hidden="true" />
            <div
              ref={dialogRef}
              id="filter-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="filter-dialog-title"
              className="fixed inset-y-0 left-0 z-[70] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto bg-white px-5 py-8 shadow-2xl dark:bg-[#111111]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 id="filter-dialog-title" className="font-barlow font-bold uppercase text-base tracking-widest dark:text-white">
                  Filtros
                </h2>
                <button
                  type="button"
                  onClick={closeFilters}
                  className="text-[#4A4A4A] dark:text-white/50 text-2xl leading-none"
                  aria-label="Cerrar filtros"
                >
                  ×
                </button>
              </div>
              {sidebarContent}
            </div>
          </>
        )}
      </div>
    </>
  )
}
