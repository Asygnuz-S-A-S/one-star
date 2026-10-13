import Link from "next/link"
import { listReviewsForAdmin } from "@/server/services/review.service"
import ReviewModeration from "@/components/admin/ReviewModeration"

export const metadata = { title: "Reseñas | Admin One Star" }
export const dynamic = "force-dynamic"

const FILTERS = [
  { value: "pendientes", label: "Pendientes", filter: "pending" },
  { value: "aprobadas", label: "Publicadas", filter: "approved" },
  { value: "destacadas", label: "Destacadas", filter: "featured" },
  { value: "todas", label: "Todas", filter: "all" },
] as const

export default async function ResenasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado } = await searchParams
  const active = FILTERS.find((f) => f.value === estado) ?? FILTERS[0]
  const reviews = await listReviewsForAdmin(active.filter)

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C] mb-1">Reseñas</h1>
      <p className="text-sm text-[#4A4A4A] mb-6">
        Las reseñas de clientes llegan como pendientes: solo se publican (y suman a las estrellas en Google) cuando las apruebas.
        Puedes editar testimonios y marcar reseñas aprobadas como destacadas para que aparezcan en la página de su marca.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/resenas?estado=${f.value}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              f.value === active.value ? "bg-[#1C1C1C] text-white" : "border border-gray-200 text-[#1C1C1C] hover:bg-gray-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <ReviewModeration
        reviews={reviews.map((r) => ({
          id: r.id,
          userName: r.userName,
          rating: r.rating,
          title: r.title,
          body: r.body,
          verified: r.verified,
          isApproved: r.isApproved,
          isFeatured: r.isFeatured,
          createdAt: r.createdAt.toISOString(),
          productName: r.product.name,
          productSlug: r.product.slug,
        }))}
      />
    </div>
  )
}
