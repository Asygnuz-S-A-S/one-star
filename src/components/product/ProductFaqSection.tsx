import type { ProductFaq } from "@/lib/product-faq"

/** Preguntas frecuentes en HTML nativo (<details>): indexables y accesibles sin JavaScript. */
export default function ProductFaqSection({ faqs }: { faqs: ProductFaq[] }) {
  if (faqs.length === 0) return null
  return (
    <section aria-labelledby="preguntas-frecuentes" className="mb-16" data-testid="product-faq">
      <h2 id="preguntas-frecuentes" className="font-[var(--font-barlow)] text-2xl font-black uppercase tracking-tight text-[#1C1C1C] dark:text-white md:text-3xl">
        Preguntas frecuentes
      </h2>
      <div className="mt-2 h-1 w-12 bg-[#E31C23]" />
      <div className="mt-6 divide-y divide-[#E0E0E0] border-y border-[#E0E0E0] dark:divide-white/10 dark:border-white/10">
        {faqs.map((faq) => (
          <details key={faq.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <h3 className="font-[var(--font-montserrat)] text-sm font-semibold text-[#1C1C1C] dark:text-white">{faq.q}</h3>
              <span className="ml-2 select-none text-xl leading-none text-[#4A4A4A] transition-transform group-open:rotate-45 dark:text-gray-400" aria-hidden="true">+</span>
            </summary>
            <p className="mt-3 font-[var(--font-montserrat)] text-sm leading-relaxed text-[#4A4A4A] dark:text-gray-300">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
