import Skeleton from "@/components/ui/Skeleton"

/** Ficha cargando: misma forma que la ficha (galería a la izquierda, compra a la derecha). */
export default function Loading() {
  return (
    <div role="status" aria-label="Cargando producto" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="mb-6 h-4 w-56" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
        <div>
          <Skeleton className="aspect-square w-full" />
          <div className="mt-3 flex gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16 w-16" />)}</div>
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-5 gap-2">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-11" />)}</div>
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}
