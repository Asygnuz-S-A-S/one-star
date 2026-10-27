import Link from "next/link"

export default function NotFound() {
  return (
    <div className="store-gutter mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center py-16">
      <p className="store-eyebrow">Error 404</p>
      <h1 className="mt-3 font-barlow text-5xl font-extrabold uppercase leading-none tracking-[-0.03em] text-[#1C1C1C]">
        Esta página no existe
      </h1>
      <p className="mt-4 font-montserrat text-base text-[#4A4A4A]">
        El enlace está mal escrito o el producto ya no está publicado. Puedes volver al inicio o buscar en la tienda.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="inline-flex min-h-12 items-center rounded-[var(--store-radius-md)] bg-[#E31C23] px-6 font-barlow text-sm font-bold uppercase tracking-wider text-white">
          Ir al inicio
        </Link>
        <Link href="/productos" className="inline-flex min-h-12 items-center rounded-[var(--store-radius-md)] border border-[#1C1C1C] px-6 font-barlow text-sm font-bold uppercase tracking-wider text-[#1C1C1C]">
          Ver la tienda
        </Link>
      </div>
    </div>
  )
}
