"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { submitReviewAction } from "@/server/actions/review.actions"
import { useSession } from "@/lib/auth-client"
import type { ProductReview } from "@prisma/client"

interface ProductReviewsProps {
  productId: string
  initialReviews: ProductReview[]
  stats: { avg: number; count: number; distribution: number[] }
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
          className={star <= Math.round(rating) ? "text-yellow-400" : "text-gray-200 dark:text-white/10"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  )
}

function InteractiveStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <svg width={28} height={28} viewBox="0 0 24 24" fill="currentColor"
            className={star <= (hover || value) ? "text-yellow-400" : "text-gray-200"}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
      ))}
    </div>
  )
}

export default function ProductReviews({ productId, initialReviews, stats }: ProductReviewsProps) {
  const [reviews, setReviews] = useState(initialReviews)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const { data: session } = useSession()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    const formData = new FormData(e.currentTarget)
    formData.set("productId", productId)
    formData.set("rating", String(rating))
    if (session?.user?.id) formData.set("userId", session.user.id)
    const result = await submitReviewAction(formData)
    setSubmitting(false)
    if (result.ok) {
      setSuccess(true)
      setIsFormOpen(false)
      // Optimistic update
      const newReview = {
        id: Date.now().toString(),
        productId,
        userId: session?.user?.id ?? null,
        userName: formData.get("userName") as string,
        rating,
        title: formData.get("title") as string | null,
        body: formData.get("body") as string,
        verified: false,
        createdAt: new Date(),
      } as ProductReview
      setReviews(prev => [newReview, ...prev])
    } else {
      setError(result.error ?? "Error al enviar")
    }
  }

  return (
    <section className="py-16 border-t border-[#E0E0E0] dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-[var(--font-barlow)] font-bold text-2xl uppercase tracking-wider text-[#1C1C1C] dark:text-white mb-1">
              Reseñas
            </h2>
            {stats.count > 0 && (
              <div className="flex items-center gap-3">
                <StarRating rating={stats.avg} size={18}/>
                <span className="font-[var(--font-barlow)] font-bold text-xl text-[#1C1C1C] dark:text-white">
                  {stats.avg.toFixed(1)}
                </span>
                <span className="font-[var(--font-montserrat)] text-sm text-[#4A4A4A] dark:text-gray-400">
                  ({stats.count} reseña{stats.count !== 1 ? "s" : ""})
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="font-[var(--font-montserrat)] font-semibold text-xs uppercase tracking-widest border border-[#1C1C1C] dark:border-white text-[#1C1C1C] dark:text-white px-6 py-3 hover:bg-[#1C1C1C] hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-200"
          >
            Escribir reseña
          </button>
        </div>

        {/* Rating distribution bar */}
        {stats.count > 0 && (
          <div className="flex gap-8 mb-10 flex-wrap">
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              {[5, 4, 3, 2, 1].map((star, idx) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs w-4 text-[#4A4A4A] dark:text-gray-400 font-[var(--font-montserrat)]">{star}</span>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400 shrink-0">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-yellow-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.count > 0 ? (stats.distribution[idx] / stats.count) * 100 : 0}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                    />
                  </div>
                  <span className="text-xs text-[#4A4A4A] dark:text-gray-400 w-4 font-[var(--font-montserrat)]">
                    {stats.distribution[idx]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {reviews.length === 0 && !isFormOpen && (
          <div className="text-center py-16 bg-[#F5F5F5] dark:bg-white/5 rounded-2xl">
            <p className="font-[var(--font-barlow)] font-bold text-lg text-[#1C1C1C] dark:text-white mb-2">
              Sé el primero en reseñar este producto
            </p>
            <p className="font-[var(--font-montserrat)] text-sm text-[#4A4A4A] dark:text-gray-400">
              Comparte tu experiencia con otros compradores.
            </p>
          </div>
        )}

        {/* Reviews grid — Nike 3-column style */}
        {reviews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-[#F5F5F5] dark:bg-white/5 dark:border dark:border-white/10 p-6 rounded-2xl flex flex-col gap-3"
              >
                <StarRating rating={review.rating} size={14}/>
                {review.title && (
                  <h3 className="font-[var(--font-barlow)] font-bold text-sm text-[#1C1C1C] dark:text-white uppercase tracking-wide">
                    {review.title}
                  </h3>
                )}
                <p className="font-[var(--font-montserrat)] text-sm text-[#4A4A4A] dark:text-gray-300 leading-relaxed flex-1">
                  {review.body}
                </p>
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#E0E0E0] dark:border-white/10">
                  <span className="font-[var(--font-montserrat)] font-semibold text-xs text-[#1C1C1C] dark:text-white capitalize">
                    {review.userName}
                  </span>
                  <div className="flex items-center gap-2">
                    {review.verified && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                        ✓ Verificado
                      </span>
                    )}
                    <span className="text-[10px] text-[#4A4A4A] dark:text-gray-500 font-[var(--font-montserrat)]">
                      {new Date(review.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Write review form */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#F5F5F5] dark:bg-white/5 border dark:border-white/10 rounded-2xl p-8 mt-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-[var(--font-barlow)] font-bold text-lg uppercase tracking-wider text-[#1C1C1C] dark:text-white">
                  Tu reseña
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="text-[#4A4A4A] dark:text-gray-400 hover:text-[#1C1C1C] dark:hover:text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="font-[var(--font-montserrat)] text-xs font-semibold uppercase tracking-wider text-[#4A4A4A] dark:text-gray-400 mb-2 block">
                    Calificación *
                  </label>
                  <InteractiveStars value={rating} onChange={setRating} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-[var(--font-montserrat)] text-xs font-semibold uppercase tracking-wider text-[#4A4A4A] dark:text-gray-400 mb-2 block">
                      Nombre *
                    </label>
                    <input
                      name="userName"
                      required
                      defaultValue={session?.user?.name ?? ""}
                      placeholder="Tu nombre"
                      className="w-full px-4 py-3 border border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-white/5 font-[var(--font-montserrat)] text-sm text-[#1C1C1C] dark:text-white focus:outline-none focus:border-[#1C1C1C] dark:focus:border-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="font-[var(--font-montserrat)] text-xs font-semibold uppercase tracking-wider text-[#4A4A4A] dark:text-gray-400 mb-2 block">
                      Título (opcional)
                    </label>
                    <input
                      name="title"
                      placeholder="Resume tu experiencia"
                      className="w-full px-4 py-3 border border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-white/5 font-[var(--font-montserrat)] text-sm text-[#1C1C1C] dark:text-white focus:outline-none focus:border-[#1C1C1C] dark:focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-[var(--font-montserrat)] text-xs font-semibold uppercase tracking-wider text-[#4A4A4A] dark:text-gray-400 mb-2 block">
                    Comentario *
                  </label>
                  <textarea
                    name="body"
                    required
                    rows={4}
                    placeholder="¿Qué te pareció este producto? ¿Cómo es el tallaje, comodidad, calidad?"
                    className="w-full px-4 py-3 border border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-white/5 font-[var(--font-montserrat)] text-sm text-[#1C1C1C] dark:text-white focus:outline-none focus:border-[#1C1C1C] dark:focus:border-white transition-colors resize-none"
                  />
                </div>

                {error && (
                  <p className="text-sm text-[#E31C23] font-[var(--font-montserrat)]">{error}</p>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-[#1C1C1C] dark:bg-white text-white dark:text-black font-[var(--font-barlow)] font-bold text-sm uppercase tracking-widest hover:bg-[#E31C23] dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Enviando..." : "Publicar reseña"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-6 py-3 border border-[#E0E0E0] dark:border-white/20 font-[var(--font-montserrat)] text-sm text-[#4A4A4A] dark:text-gray-400 hover:border-[#1C1C1C] dark:hover:border-white transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {success && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-green-600 dark:text-green-400 font-[var(--font-montserrat)] text-sm mt-4"
          >
            ✓ ¡Gracias por tu reseña! Ya está publicada.
          </motion.p>
        )}
      </div>
    </section>
  )
}
