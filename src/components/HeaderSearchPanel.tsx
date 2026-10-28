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
          className="min-h-11 min-w-0 flex-1 border border-[#E0E0E0] bg-white px-4 font-montserrat text-sm text-[#1C1C1C] outline-none transition-colors placeholder:text-[#4A4A4A]/60 focus-visible:border-[#E31C23] focus-visible:ring-2 focus-visible:ring-[#E31C23]/30 dark:border-white/15 dark:bg-[#151515] dark:text-white"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 bg-[#1C1C1C] px-5 font-barlow text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#E31C23] focus-visible:bg-[#E31C23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E31C23]/40 md:px-8"
        >
          Buscar
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar búsqueda"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-sm text-[#4A4A4A] transition-colors hover:text-[#E31C23] focus-visible:outline-2 focus-visible:outline-[#E31C23] dark:text-white/60"
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
