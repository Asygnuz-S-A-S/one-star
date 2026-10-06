"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { createReviewAction, deleteReviewAction, moderateReviewAction } from "@/app/admin/resenas/actions"
import { searchProducts } from "@/app/admin/productos/actions"

export interface AdminReviewRow {
  id: string
  userName: string
  rating: number
  title: string | null
  body: string
  verified: boolean
  isApproved: boolean
  createdAt: string
  productName: string
  productSlug: string
}

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"

function Stars({ rating }: { rating: number }) {
  return <span className="text-yellow-500" aria-label={`${rating} de 5`}>{"★".repeat(rating)}<span className="text-gray-300">{"★".repeat(5 - rating)}</span></span>
}

function NewReviewForm() {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{ id: string; name: string }[]>([])
  const [product, setProduct] = useState<{ id: string; name: string } | null>(null)

  async function search(q: string) {
    setQuery(q)
    setProduct(null)
    if (q.length < 2) return setResults([])
    setResults((await searchProducts(q)).map((r) => ({ id: r.id, name: r.name })))
  }

  function submit(formData: FormData) {
    if (product) formData.set("productId", product.id)
    startTransition(async () => {
      const result = await createReviewAction(formData)
      setMessage(result.success ? { ok: true, text: "Reseña publicada." } : { ok: false, text: result.error ?? "No se pudo guardar." })
      if (result.success) {
        setProduct(null)
        setQuery("")
      }
    })
  }

  return (
    <details className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold text-[#1C1C1C]">+ Cargar una reseña propia (testimonio real)</summary>
      <form action={submit} className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="relative md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Producto</label>
          <input value={product ? product.name : query} onChange={(e) => search(e.target.value)} placeholder="Busca el producto…" className={inputClass} />
          {!product && results.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {results.map((r) => (
                <button key={r.id} type="button" onClick={() => { setProduct(r); setResults([]) }} className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre del cliente</label>
          <input name="userName" required maxLength={80} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Calificación</label>
          <select name="rating" defaultValue="5" className={inputClass}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} estrellas</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Título (opcional)</label>
          <input name="title" maxLength={120} className={inputClass} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Comentario</label>
          <textarea name="body" required rows={3} maxLength={2000} className={inputClass} />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="verified" /> Compra verificada</label>
        <div className="flex items-center justify-end gap-3 md:col-span-2">
          {message && <span className={`text-sm ${message.ok ? "text-green-700" : "text-[#E31C23]"}`}>{message.text}</span>}
          <button disabled={pending || !product} className="rounded-lg bg-[#E31C23] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? "Guardando…" : "Publicar reseña"}
          </button>
        </div>
      </form>
    </details>
  )
}

export default function ReviewModeration({ reviews }: { reviews: AdminReviewRow[] }) {
  const [rows, setRows] = useState(reviews)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function moderate(id: string, isApproved: boolean) {
    startTransition(async () => {
      const result = await moderateReviewAction(id, isApproved)
      if (!result.success) return setError(result.error ?? "No se pudo actualizar.")
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, isApproved } : r)))
    })
  }

  function remove(id: string) {
    if (!confirm("¿Eliminar esta reseña? No se puede deshacer.")) return
    startTransition(async () => {
      const result = await deleteReviewAction(id)
      if (!result.success) return setError(result.error ?? "No se pudo eliminar.")
      setRows((prev) => prev.filter((r) => r.id !== id))
    })
  }

  return (
    <div>
      <NewReviewForm />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-[#E31C23]">{error}</p>}
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">No hay reseñas en esta vista.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-5" data-testid="review-row">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Stars rating={r.rating} />
                  <span className="text-sm font-semibold">{r.userName}</span>
                  {r.verified && <span className="text-xs font-semibold text-green-700">✓ Verificado</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.isApproved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
                    {r.isApproved ? "Publicada" : "Pendiente"}
                  </span>
                </div>
                <time className="text-xs text-gray-400" dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleDateString("es-CO")}</time>
              </div>
              {r.title && <p className="mt-2 text-sm font-semibold">{r.title}</p>}
              <p className="mt-1 text-sm text-[#4A4A4A]">{r.body}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Link href={`/productos/${r.productSlug}#resenas`} className="text-xs text-blue-600 hover:underline">{r.productName}</Link>
                <div className="flex gap-2">
                  <button onClick={() => moderate(r.id, !r.isApproved)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">
                    {r.isApproved ? "Ocultar" : "Aprobar y publicar"}
                  </button>
                  <button onClick={() => remove(r.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#E31C23] hover:bg-red-50">Eliminar</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
