const BRANDS = ["Nike", "New Balance", "Hoka", "Veja", "On Running", "Adidas", "Asics"]

export default function BrandStrip() {
  const allBrands = [...BRANDS, ...BRANDS]

  return (
    <section className="bg-[#E0E0E0] py-6 overflow-hidden">
      {/* Mobile/tablet: marquee */}
      <div className="md:hidden relative overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {allBrands.map((brand, i) => (
            <span
              key={i}
              className="font-[var(--font-barlow)] font-bold uppercase text-[#4A4A4A] text-sm tracking-widest mx-6 shrink-0"
            >
              {brand}
              <span className="ml-6 text-[#4A4A4A]/40">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Desktop: static centered */}
      <div className="hidden md:flex items-center justify-center gap-8 flex-wrap px-8">
        {BRANDS.map((brand, i) => (
          <span key={brand} className="flex items-center gap-8">
            <span className="font-[var(--font-barlow)] font-bold uppercase text-[#4A4A4A] text-sm tracking-widest hover:text-[#1C1C1C] transition-colors cursor-default">
              {brand}
            </span>
            {i < BRANDS.length - 1 && (
              <span className="text-[#4A4A4A]/40 font-bold">·</span>
            )}
          </span>
        ))}
      </div>
    </section>
  )
}
