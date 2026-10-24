import type { StorePromise } from "@/lib/store-promises"
import { splitHighlight } from "@/lib/product-faq"
import { PromiseIcon } from "./ProductTrust"

interface WhyBuyProps {
  productName: string
  highlights: string[]
  promises: StorePromise[]
}

/** "¿Por qué comprarlo?": beneficios propios del producto + garantías reales de la tienda. */
export default function WhyBuy({ productName, highlights, promises }: WhyBuyProps) {
  if (highlights.length === 0 && promises.length === 0) return null
  return (
    <section aria-labelledby="por-que-comprar" className="mb-16" data-testid="why-buy">
      <h2 id="por-que-comprar" className="font-barlow text-2xl font-black uppercase tracking-tight text-[#1C1C1C] dark:text-white md:text-3xl">
        ¿Por qué comprar {productName}?
      </h2>
      <div className="mt-2 h-1 w-12 bg-[#E31C23]" />

      {highlights.length > 0 && (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {highlights.map(splitHighlight).map(({ title, detail }) => (
            <li key={title} className="flex items-start gap-3 rounded-xl bg-[#F5F5F5] p-5 dark:bg-white/5">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-[#E31C23]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span className="font-montserrat text-sm leading-relaxed text-[#1C1C1C] dark:text-gray-200">
                <strong className="block font-semibold">{title}</strong>
                {detail && <span className="text-[#4A4A4A] dark:text-gray-400">{detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {promises.filter((p) => p.icon !== "chat").map((promise) => (
          <li key={promise.id} className="flex flex-col gap-2 rounded-xl border border-[#E0E0E0] p-5 dark:border-white/10">
            <PromiseIcon icon={promise.icon} className="h-6 w-6 text-[#1C1C1C] dark:text-white" />
            <strong className="font-barlow text-sm font-bold uppercase tracking-wide text-[#1C1C1C] dark:text-white">{promise.title}</strong>
            <span className="font-montserrat text-xs leading-relaxed text-[#4A4A4A] dark:text-gray-400">{promise.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
