import Image from "next/image"
import Link from "next/link"
import { getStorefrontBrands } from "@/server/services/brand.service"
import { resolveBrandLogoUrl } from "@/lib/brand-logos"

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
    // El layout ya aporta el <main>: aquí un <div> evita dos landmarks principales.
    <div className="store-section store-gutter mx-auto max-w-7xl">
      <section aria-labelledby="marcas-heading" className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="store-eyebrow mb-3">Curaduría One Star</p>
          <h1
            id="marcas-heading"
            className="font-barlow text-4xl font-extrabold uppercase leading-none tracking-[-0.03em] text-[#1C1C1C] sm:text-5xl"
          >
            Marcas
          </h1>
          <span aria-hidden="true" className="mt-3 block h-1 w-12 bg-[#E31C23]" />
          <p className="mt-4 font-montserrat text-base text-[#4A4A4A]">
            Elige una marca para ver todos sus productos.
          </p>
        </div>
        {brands.length > 0 && (
          <p className="font-montserrat text-sm text-[#4A4A4A]">{brands.length} marcas</p>
        )}
      </section>

      {brands.length === 0 ? (
        <p className="pb-16 font-montserrat text-sm text-[#4A4A4A]">
          Todavía no hay marcas con productos publicados.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {brands.map((brand) => {
            const logoUrl = resolveBrandLogoUrl(brand)
            return (
              <li key={brand.id}>
                <Link
                  href={`/marcas/${brand.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[var(--store-radius-lg)] border border-[#ECECEA] bg-white transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-1 hover:border-[#1C1C1C]/20 hover:shadow-[var(--store-elevation-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E31C23]"
                >
                  {/* Logos en escala de grises para una grilla uniforme; recuperan su color al pasar el cursor. */}
                  <span className="grid aspect-[4/3] place-items-center bg-[radial-gradient(ellipse_at_50%_45%,#ffffff_0%,#f7f7f5_70%)] px-6">
                    {logoUrl ? (
                      <span className="relative block h-12 w-full max-w-[150px] sm:h-14">
                        <Image
                          src={logoUrl}
                          alt={`Logo de ${brand.name}`}
                          fill
                          sizes="150px"
                          className="object-contain opacity-80 grayscale transition-[filter,opacity,transform] duration-300 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0"
                        />
                      </span>
                    ) : (
                      <span className="font-barlow text-2xl font-extrabold uppercase tracking-wide text-[#1C1C1C]">
                        {brand.name}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-2 border-t border-[#ECECEA] px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-barlow text-sm font-bold uppercase tracking-[0.04em] text-[#1C1C1C]">{brand.name}</span>
                      <span className="block font-montserrat text-xs text-[#4A4A4A]">
                        {brand.productCount} {brand.productCount === 1 ? "producto" : "productos"}
                      </span>
                    </span>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#1C1C1C] transition-transform group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
