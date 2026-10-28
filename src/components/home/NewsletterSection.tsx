import Link from "next/link"

/**
 * Sección "Newsletter" del constructor: invita a One Star Club, que es donde se acepta
 * recibir correos (con consentimiento guardado). No hay formulario suelto que prometa
 * una suscripción sin cuenta.
 */
export default function NewsletterSection({ config = {} }: { config?: Record<string, unknown> }) {
  const title = typeof config.title === "string" && config.title.trim() ? config.title : "One Star Club"
  const subtitle = typeof config.subtitle === "string" && config.subtitle.trim()
    ? config.subtitle
    : "Únete gratis: promociones exclusivas para miembros y, si quieres, lanzamientos y novedades en tu correo."

  return (
    <section className="relative overflow-hidden bg-[#1C1C1C] text-white">
      <span aria-hidden="true" className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 select-none font-barlow text-[16rem] font-black leading-none text-white/[0.05] md:text-[24rem]">★</span>
      <div className="store-gutter store-section relative mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-xl">
          <p className="store-eyebrow mb-3">Comunidad One Star</p>
          <h2 className="font-barlow text-4xl font-extrabold uppercase leading-none tracking-[-0.03em] md:text-6xl">{title}</h2>
          <span aria-hidden="true" className="mt-4 block h-1 w-12 bg-[#E31C23]" />
          <p className="mt-4 whitespace-pre-wrap font-montserrat text-base text-white/75">{subtitle}</p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/club" className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-[var(--store-radius-md)] bg-[#E31C23] px-7 font-barlow text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#C01920]">
            Unirme al club
          </Link>
          <Link href="/club" className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-[var(--store-radius-md)] border border-white/40 px-7 font-barlow text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10">
            Ver beneficios
          </Link>
        </div>
      </div>
    </section>
  )
}
