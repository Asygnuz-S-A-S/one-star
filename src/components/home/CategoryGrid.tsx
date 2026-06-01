import Link from "next/link"

interface CategoryItem {
  label: string
  href: string
  bgColor: string
  emoji: string
  darkText?: boolean
}

const CATEGORIES: CategoryItem[] = [
  { label: "Lanzamientos", href: "/lanzamientos", bgColor: "bg-[#1C1C1C]", emoji: "🚀" },
  { label: "Hombre", href: "/hombre", bgColor: "bg-[#2C2C2C]", emoji: "👟" },
  { label: "Mujer", href: "/mujer", bgColor: "bg-[#3A3A3A]", emoji: "✨" },
  { label: "Niños", href: "/ninos", bgColor: "bg-[#4A4A4A]", emoji: "⭐" },
  { label: "SALE", href: "/sale", bgColor: "bg-[#E31C23]", emoji: "%" },
  { label: "Accesorios", href: "/accesorios", bgColor: "bg-[#E0E0E0]", emoji: "🎒", darkText: true },
  { label: "Tarjeta\nRegalo", href: "/tarjeta-regalo", bgColor: "bg-[#1C1C1C]", emoji: "🎁" },
]

export default function CategoryGrid() {
  return (
    <section className="px-4 md:px-8 lg:px-16 py-8 md:py-12">
      {/* Mobile: horizontal scroll */}
      <div className="flex md:hidden gap-3 overflow-x-auto scrollbar-hide pb-2">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className={`${cat.bgColor} w-32 h-32 shrink-0 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform duration-200 rounded-sm`}
          >
            <span className="text-2xl">{cat.emoji}</span>
            <span
              className={`font-[var(--font-barlow)] font-bold uppercase text-xs text-center leading-tight whitespace-pre-line px-2 ${cat.darkText ? "text-[#1C1C1C]" : "text-white"}`}
            >
              {cat.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-4 gap-3">
        {CATEGORIES.map((cat, i) => (
          <Link
            key={cat.href}
            href={cat.href}
            className={`${cat.bgColor} h-40 flex flex-col items-center justify-center gap-3 hover:scale-105 transition-transform duration-200 ${i === 4 ? "relative overflow-hidden" : ""}`}
          >
            {i === 4 && (
              <span className="absolute top-3 right-4 text-white/20 font-[var(--font-barlow)] font-black text-6xl leading-none select-none">
                *
              </span>
            )}
            <span className="text-3xl">{cat.emoji}</span>
            <span
              className={`font-[var(--font-barlow)] font-bold uppercase text-sm text-center leading-tight whitespace-pre-line px-4 ${cat.darkText ? "text-[#1C1C1C]" : "text-white"}`}
            >
              {cat.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
