import { EditorialSurface, MediaFrame, PublicButton } from "@/components/storefront/public-primitives"
import type { EditorialBlockConfig } from "@/lib/editorial-config"
import ScrollReveal from "@/components/home/ScrollReveal"

const appearanceClasses = {
  light: "bg-[var(--store-surface)] text-[var(--store-ink)]",
  carbon: "bg-[var(--store-ink)] text-white",
  oneStarRed: "bg-[var(--store-action)] text-white",
} as const

export default function EditorialBlock({ block }: { block: EditorialBlockConfig }) {
  return (
    <section className="bg-[var(--store-canvas)] px-4 py-10 md:px-8 md:py-16 lg:px-16">
      <ScrollReveal>
        <EditorialSurface className={`overflow-hidden rounded-none shadow-none md:grid md:grid-cols-2 ${appearanceClasses[block.appearance]}`}>
          <div className="flex min-h-72 flex-col justify-center p-7 md:p-12">
          <p className="font-barlow text-xs font-bold uppercase tracking-[0.16em] text-[var(--store-action)]">One Star</p>
          <h2 className="mt-3 font-barlow text-4xl font-black uppercase leading-[0.9] tracking-[-0.045em] md:text-5xl">{block.title}</h2>
          {block.body && <p className="mt-5 max-w-lg text-sm leading-relaxed opacity-80 md:text-base">{block.body}</p>}
          {block.cta && <div className="mt-7"><PublicButton href={block.cta.href} variant={block.appearance === "light" ? "primary" : "outline"} className={block.appearance === "light" ? "" : "border-current bg-transparent text-current hover:bg-white/10"}>{block.cta.label}</PublicButton></div>}
        </div>
          <MediaFrame src={block.media?.src} alt={block.media?.alt ?? ""} fallbackLabel={`Imagen de ${block.title} próximamente`} className="min-h-72 rounded-none bg-black/10" sizes="(max-width: 768px) 100vw, 50vw" />
        </EditorialSurface>
      </ScrollReveal>
    </section>
  )
}
