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
        className="min-h-11 min-w-0 flex-1 border border-[#E0E0E0] bg-white px-4 font-montserrat text-sm text-[#1C1C1C] outline-none transition-colors placeholder:text-[#4A4A4A]/60 focus-visible:border-[#E31C23] focus-visible:ring-2 focus-visible:ring-[#E31C23]/30 dark:border-white/15 dark:bg-[#151515] dark:text-white"
      />

      {Object.entries(preservedParams ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <button
        type="submit"
        className="min-h-11 shrink-0 bg-[#1C1C1C] px-8 font-barlow text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#E31C23] focus-visible:bg-[#E31C23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E31C23]/40"
      >
        Buscar
      </button>
    </form>
  )
}
