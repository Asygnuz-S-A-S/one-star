import Skeleton from "@/components/ui/Skeleton"

/** Mientras carga cualquier página de la tienda: evita el parpadeo en blanco entre páginas. */
export default function Loading() {
  return (
    <div role="status" aria-label="Cargando" className="store-gutter mx-auto max-w-7xl py-6">
      <Skeleton className="h-[52vh] w-full md:h-[60vh]" />
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] w-full" />)}
      </div>
    </div>
  )
}
