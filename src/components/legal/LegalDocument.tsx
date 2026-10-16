import type { ReactNode } from "react"
import { formatLegalDate, hasPendingCompanyData, LEGAL_COMPANY } from "@/lib/legal"

interface LegalDocumentProps {
  title: string
  intro: string
  lastUpdated: string
  children: ReactNode
}

/**
 * Marco compartido por /terminos y /privacidad: encabezado, fecha de vigencia,
 * datos del responsable y tipografía de lectura larga.
 */
export default function LegalDocument({
  title,
  intro,
  lastUpdated,
  children,
}: LegalDocumentProps) {
  return (
    <main className="min-h-screen bg-[#F5F5F5] dark:bg-[#0f0f0f] pt-24 pb-20 px-4 transition-colors">
      <article className="max-w-3xl mx-auto bg-white dark:bg-[#151515] rounded-lg shadow-xl overflow-hidden transition-colors">
        <header className="border-b border-[#E0E0E0] dark:border-white/10 px-6 md:px-12 py-10">
          <p className="font-[var(--font-barlow)] uppercase tracking-widest text-xs text-[#E31C23] mb-3">
            {LEGAL_COMPANY.tradeName}
          </p>
          <h1 className="font-[var(--font-barlow)] font-bold uppercase tracking-tight text-3xl md:text-4xl text-[#1C1C1C] dark:text-white">
            {title}
          </h1>
          <p className="font-[var(--font-montserrat)] text-sm text-[#4A4A4A] dark:text-white/60 mt-4">
            {intro}
          </p>
          <p className="font-[var(--font-montserrat)] text-xs text-[#4A4A4A] dark:text-white/40 mt-4">
            Última actualización: {formatLegalDate(lastUpdated)}
          </p>
        </header>

        {hasPendingCompanyData() && (
          <p
            role="note"
            className="mx-6 md:mx-12 mt-8 border-l-4 border-[#E31C23] bg-[#E31C23]/5 px-4 py-3 font-[var(--font-montserrat)] text-sm text-[#4A4A4A] dark:text-white/70"
          >
            Los datos de identificación del responsable (razón social, NIT, domicilio y canales de
            contacto) están pendientes de confirmación y se publicarán en cuanto se validen.
          </p>
        )}

        <div className="px-6 md:px-12 py-10 font-[var(--font-montserrat)] text-[#4A4A4A] dark:text-white/70 leading-relaxed space-y-8">
          {children}
        </div>
      </article>
    </main>
  )
}

interface LegalSectionProps {
  id: string
  heading: string
  children: ReactNode
}

export function LegalSection({ id, heading, children }: LegalSectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2
        id={id}
        className="font-[var(--font-barlow)] font-bold uppercase tracking-wide text-lg text-[#1C1C1C] dark:text-white"
      >
        {heading}
      </h2>
      {children}
    </section>
  )
}

/** Lista con viñetas con el espaciado del documento. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-2">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
}
