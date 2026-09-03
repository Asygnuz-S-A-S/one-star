/**
 * Formulario de búsqueda del catálogo. Es un Server Component: envía un GET a
 * /buscar, así la búsqueda queda en la URL (compartible y navegable) y funciona
 * aunque el JavaScript del cliente no haya cargado.
 */
interface SearchFormProps {
  /** Término actual, para precargar el campo. */
  query?: string
  /**
   * Filtros activos que deben sobrevivir a una nueva búsqueda
   * (marca, talla, color, rango de precio y orden).
   */
  preservedParams?: Record<string, string>
}

export default function SearchForm({ query, preservedParams }: SearchFormProps) {
  return (
    <form
      action="/buscar"
      method="get"
      role="search"
      className="flex flex-col sm:flex-row gap-3 px-4 md:px-8 pt-8"
    >
      <label htmlFor="buscar-q" className="sr-only">
        Buscar productos
      </label>
      <input
        id="buscar-q"
        type="search"
        name="q"
        defaultValue={query ?? ""}
        placeholder="Busca por producto, marca o modelo"
        autoComplete="off"
        className="flex-1 min-w-0 border border-[#E0E0E0] dark:border-white/15 bg-white dark:bg-[#151515] text-[#1C1C1C] dark:text-white placeholder:text-[#4A4A4A]/60 font-[var(--font-montserrat)] text-sm px-4 py-3 outline-none focus-visible:border-[#E31C23] focus-visible:ring-2 focus-visible:ring-[#E31C23]/30 transition-colors"
      />

      {Object.entries(preservedParams ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <button
        type="submit"
        className="shrink-0 bg-[#1C1C1C] text-white font-[var(--font-barlow)] font-bold uppercase text-xs tracking-widest px-8 py-3 hover:bg-[#E31C23] focus-visible:bg-[#E31C23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E31C23]/40 transition-colors"
      >
        Buscar
      </button>
    </form>
  )
}
