import Skeleton from "@/components/ui/Skeleton"

/** El admin tiene su propio esqueleto: sin él heredaría el de la tienda (hero + tarjetas). */
export default function Loading() {
  return (
    <div role="status" aria-label="Cargando" className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
