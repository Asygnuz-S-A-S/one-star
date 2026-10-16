import Image from "next/image"
import Link from "next/link"
import { getStorefrontBrands } from "@/server/services/brand.service"

export const metadata = {
  title: "Marcas | One Star",
  description: "Explora el catálogo One Star por marca: Converse, Nike, Vans, New Balance y más.",
}

/**
 * Directorio de marcas (HU-5): entrada visible al catálogo filtrado por marca,
 * además del filtro lateral. Solo lista marcas activas con productos publicados.
 */
export default async function MarcasPage() {
  const brands = await getStorefrontBrands()

  return (
    <main className="min-h-screen">
      <section aria-labelledby="marcas-heading" className="px-4 md:px-8 py-8">
        <h1
          id="marcas-heading"
          className="font-[var(--font-barlow)] font-bold text-3xl md:text-5xl uppercase tracking-tight text-[#1C1C1C]"
        >
          Marcas
        </h1>
        <p className="font-[var(--font-montserrat)] text-[#4A4A4A] mt-1 text-sm">
          Elige una marca para ver todos sus productos.
        </p>
      </section>

      {brands.length === 0 ? (
        <p className="px-4 md:px-8 pb-16 font-[var(--font-montserrat)] text-sm text-[#4A4A4A]">
          Todavía no hay marcas con productos publicados.
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 px-4 md:px-8 pb-16">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/marcas/${brand.slug}`}
                className="group flex h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-[#E0E0E0] bg-white px-4 transition-all hover:-translate-y-0.5 hover:border-[#1C1C1C] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E31C23]"
              >
                {brand.logoUrl ? (
                  <span className="relative block h-12 w-32">
                    <Image
                      src={brand.logoUrl}
                      alt={brand.name}
                      fill
                      sizes="128px"
                      className="object-contain grayscale transition-all group-hover:grayscale-0"
                    />
                  </span>
                ) : (
                  <span className="font-[var(--font-barlow)] text-2xl font-bold uppercase tracking-wide text-[#1C1C1C]">
                    {brand.name}
                  </span>
                )}
                <span className="font-[var(--font-montserrat)] text-xs text-[#4A4A4A]">
                  {brand.logoUrl && <span className="font-semibold text-[#1C1C1C]">{brand.name} · </span>}
                  {brand.productCount} {brand.productCount === 1 ? "producto" : "productos"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
