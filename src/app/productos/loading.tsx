import Skeleton from "@/components/ui/Skeleton"

/** Catálogo cargando: encabezado y grilla de tarjetas. */
export default function Loading() {
  return (
    <div role="status" aria-label="Cargando productos" className="store-gutter mx-auto max-w-7xl py-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="mt-3 h-3 w-1/3" />
            <Skeleton className="mt-2 h-4 w-4/5" />
            <Skeleton className="mt-2 h-5 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
