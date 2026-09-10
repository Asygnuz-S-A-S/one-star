"use client";

import { useEffect, useRef } from "react";

interface HeaderSearchPanelProps {
  /** Controla la visibilidad; el estado vive en el Header. */
  open: boolean;
  onClose: () => void;
}

/**
 * Barra de búsqueda desplegable del menú superior (HU-10).
 *
 * Es un formulario GET real hacia /buscar: el término queda en la URL
 * (compartible) y el botón que lo abre sigue siendo un enlace a /buscar, así
 * que la búsqueda funciona aunque el JavaScript no haya cargado.
 */
export default function HeaderSearchPanel({ open, onClose }: HeaderSearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      id="header-search"
      className="border-b border-[#E0E0E0] dark:border-white/15 bg-white dark:bg-black"
    >
      <form
        action="/buscar"
        method="get"
        role="search"
        className="flex items-center gap-2 px-4 md:px-8 lg:px-12 xl:px-16 py-3"
      >
        <label htmlFor="header-search-q" className="sr-only">
          Buscar productos
        </label>
        <input
          ref={inputRef}
          id="header-search-q"
          type="search"
          name="q"
          placeholder="Busca por producto, marca o modelo"
          autoComplete="off"
          className="flex-1 min-w-0 border border-[#E0E0E0] dark:border-white/15 bg-white dark:bg-[#151515] text-[#1C1C1C] dark:text-white placeholder:text-[#4A4A4A]/60 font-[var(--font-montserrat)] text-sm px-4 py-2.5 outline-none focus-visible:border-[#E31C23] focus-visible:ring-2 focus-visible:ring-[#E31C23]/30 transition-colors"
        />
        <button
          type="submit"
          className="shrink-0 bg-[#1C1C1C] text-white font-[var(--font-barlow)] font-bold uppercase text-xs tracking-widest px-5 md:px-8 py-2.5 hover:bg-[#E31C23] focus-visible:bg-[#E31C23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E31C23]/40 transition-colors"
        >
          Buscar
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar búsqueda"
          className="shrink-0 p-2 text-[#4A4A4A] dark:text-white/60 hover:text-[#E31C23] rounded-sm focus-visible:outline-2 focus-visible:outline-[#E31C23] transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </form>
    </div>
  );
}
