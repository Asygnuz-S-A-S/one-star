"use client"

import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"
import { PRODUCT_COLORS, getColorSwatchStyle, isRealColor, type ColorPalette } from "@/lib/colors"

interface FilterSidebarProps {
  brands: string[]
  sizes: string[]
  colors: string[]
  currentParams: string
  /** Paleta administrable; si no llega se usa la de respaldo. */
  colorPalette?: ColorPalette
}

// Clases reutilizables con dark mode
const sectionSummary =
  "cursor-pointer font-[var(--font-barlow)] font-bold uppercase text-xs tracking-widest " +
  "text-[#1C1C1C] dark:text-white/80 py-3 border-b border-[#E0E0E0] dark:border-white/10 " +
  "select-none list-none flex justify-between items-center"

const chevron = "text-[#4A4A4A] dark:text-white/40"

const optionText = "font-[var(--font-montserrat)] text-sm text-[#4A4A4A] dark:text-white/60"

export default function FilterSidebar({
  brands,
  sizes,
  colors,
  currentParams: currentParamsString,
  colorPalette,
}: FilterSidebarProps) {
  const palette =
    colorPalette && Object.keys(colorPalette).length > 0 ? colorPalette : PRODUCT_COLORS
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const currentParams = new URLSearchParams(currentParamsString)

  const [precioMin, setPrecioMin] = useState(currentParams.get("precio_min") ?? "")
  const [precioMax, setPrecioMax] = useState(currentParams.get("precio_max") ?? "")

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
    const next = new URLSearchParams(currentParams.toString())
    if (precioMin) next.set("precio_min", precioMin); else next.delete("precio_min")
    if (precioMax) next.set("precio_max", precioMax); else next.delete("precio_max")
    next.delete("page")
    router.push(`${pathname}?${next.toString()}`)
  }

  const clearAll = () => {
    setPrecioMin("")
    setPrecioMax("")
    router.push(pathname)
  }

  const currentOrden = currentParams.get("orden") ?? "reciente"
  const currentMarca = currentParams.get("marca") ?? ""
  const currentTalla = currentParams.get("talla") ?? ""
  const currentColor = currentParams.get("color") ?? ""

  const allSizes = sizes.length > 0
    ? sizes
    : ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"]

  // Solo colores reales: descarta marcadores como "N/A" de variantes sin color.
  const realColors = colors.filter(isRealColor)
  const allColors = realColors.length > 0 ? realColors : Object.keys(palette)

  const sidebarContent = (
    <div className="flex flex-col gap-4">
      {/* Ordenar por */}
      <details open>
        <summary className={sectionSummary}>
          Ordenar por
          <span className={chevron}>▾</span>
        </summary>
        <div className="pt-3 flex flex-col gap-2">
          {[
            { label: "Más reciente", value: "reciente" },
            { label: "Precio: menor a mayor", value: "precio_asc" },
            { label: "Precio: mayor a menor", value: "precio_desc" },
            { label: "Más antiguo", value: "antiguo" },
          ].map(({ label, value }) => (
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
          {(currentParams.get("precio_min") || currentParams.get("precio_max")) && (
            <p className={optionText}>
              ${currentParams.get("precio_min") ?? "0"} — ${currentParams.get("precio_max") ?? "∞"}
            </p>
          )}
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Mínimo"
              value={precioMin}
              onChange={(e) => setPrecioMin(e.target.value)}
              className="w-full border border-[#E0E0E0] dark:border-white/10 dark:bg-white/5 rounded px-2 py-1.5 text-sm font-[var(--font-montserrat)] focus:outline-none focus:border-[#1C1C1C] dark:focus:border-white/40 dark:text-white/80 dark:placeholder:text-white/30"
            />
            <input
              type="number"
              placeholder="Máximo"
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              className="w-full border border-[#E0E0E0] dark:border-white/10 dark:bg-white/5 rounded px-2 py-1.5 text-sm font-[var(--font-montserrat)] focus:outline-none focus:border-[#1C1C1C] dark:focus:border-white/40 dark:text-white/80 dark:placeholder:text-white/30"
            />
          </div>
          <button
            onClick={applyPrecio}
            className="bg-[#1C1C1C] dark:bg-white text-white dark:text-black font-[var(--font-barlow)] font-bold uppercase text-xs tracking-widest py-2 px-4 hover:bg-[#4A4A4A] dark:hover:bg-white/80 transition-colors"
          >
            Aplicar
          </button>
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
          {allSizes.map((size) => (
            <button
              key={size}
              onClick={() => updateParam("talla", size)}
              className={`border py-1.5 text-xs font-[var(--font-montserrat)] font-medium transition-colors ${
                currentTalla === size
                  ? "bg-[#1C1C1C] dark:bg-white text-white dark:text-black border-[#1C1C1C] dark:border-white"
                  : "border-[#E0E0E0] dark:border-white/15 text-[#4A4A4A] dark:text-white/55 hover:border-[#1C1C1C] dark:hover:border-white/40"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </details>

      {/* Color */}
      <details open>
        <summary className={sectionSummary}>
          Color
          <span className={chevron}>▾</span>
        </summary>
        <div className="pt-3 flex flex-col gap-2">
          {allColors.map((color) => {
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
                  {color}
                </span>
              </button>
            )
          })}
        </div>
      </details>

      {/* Limpiar filtros */}
      <button
        onClick={clearAll}
        className="mt-4 text-xs font-[var(--font-montserrat)] text-[#4A4A4A] dark:text-white/40 underline underline-offset-2 hover:text-[#1C1C1C] dark:hover:text-white/70 text-left transition-colors"
      >
        Limpiar filtros
      </button>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block">{sidebarContent}</div>

      {/* Móvil: botón flotante + drawer */}
      <div className="md:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-40 bg-[#E31C23] text-white font-[var(--font-barlow)] font-bold uppercase text-sm tracking-widest px-5 py-3 shadow-lg"
        >
          Filtros
        </button>

        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setIsOpen(false)}
          />
        )}

        <div
          className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-[#111111] z-50 overflow-y-auto px-5 py-8 transition-transform duration-300 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-[var(--font-barlow)] font-bold uppercase text-base tracking-widest dark:text-white">
              Filtros
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#4A4A4A] dark:text-white/50 text-2xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          {sidebarContent}
        </div>
      </div>
    </>
  )
}
