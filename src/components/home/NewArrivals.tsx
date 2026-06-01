import ProductCard from "@/components/home/ProductCard"

interface Product {
  id: string
  name: string
  brand: string
  price: number
  salePrice?: number
  isNew?: boolean
  isOnSale?: boolean
}

const MOCK_PRODUCTS: Product[] = [
  { id: "2", name: "Fresh Foam 1080", brand: "New Balance", price: 580000, isNew: true },
  { id: "4", name: "Cloud X 3", brand: "On Running", price: 720000, isNew: true },
  { id: "8", name: "Séville Leather", brand: "Veja", price: 380000, isNew: true },
]

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export default function NewArrivals() {
  const [hero, ...rest] = MOCK_PRODUCTS

  return (
    <section className="px-4 md:px-8 lg:px-16 py-12 md:py-16 bg-[#F7F7F7]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 md:mb-12 gap-4">
        <div>
          <h2 className="font-[var(--font-barlow)] font-black uppercase text-3xl md:text-4xl text-[#1C1C1C] tracking-tight leading-none">
            Lanzamientos
          </h2>
          <div className="w-12 h-1 bg-[#E31C23] mt-3" />
        </div>
        <span className="inline-flex items-center gap-2 bg-[#1C1C1C] text-white font-[var(--font-barlow)] font-bold uppercase text-xs tracking-wider px-4 py-2 self-start md:self-auto">
          <span className="w-2 h-2 bg-[#E31C23] rounded-full inline-block" />
          8 nuevos modelos
        </span>
      </div>

      {/* Layout mobile: stack */}
      <div className="flex flex-col gap-4 md:hidden">
        {MOCK_PRODUCTS.map((p) => (
          <ProductCard key={p.id} {...p} />
        ))}
      </div>

      {/* Layout desktop: grid with hero */}
      <div className="hidden md:grid grid-cols-3 gap-4">
        {/* Hero item */}
        <div className="col-span-2 group cursor-pointer">
          <div className="relative aspect-[16/9] bg-[#E0E0E0] overflow-hidden mb-3">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                width="120"
                height="120"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-[#4A4A4A]/20"
              >
                <path
                  d="M8 40 C8 40 12 28 24 28 C30 28 34 32 40 32 C46 32 52 28 56 30 L56 42 C56 44 54 46 52 46 L12 46 C10 46 8 44 8 42 Z"
                  fill="currentColor"
                />
                <path d="M24 28 L20 18 L28 18 L32 28" fill="currentColor" opacity="0.6" />
              </svg>
            </div>

            {/* Overlay text */}
            <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p className="font-[var(--font-montserrat)] text-white/80 text-xs uppercase tracking-wider mb-1">
                {hero.brand}
              </p>
              <h3 className="font-[var(--font-barlow)] font-black uppercase text-white text-2xl leading-none mb-2">
                {hero.name}
              </h3>
              <p className="font-[var(--font-montserrat)] font-bold text-white text-sm">
                {formatPrice(hero.price)}
              </p>
            </div>

            <span className="absolute top-4 left-4 bg-[#1C1C1C] text-white text-[10px] font-[var(--font-barlow)] font-bold uppercase tracking-wider px-2 py-1">
              NUEVO
            </span>
          </div>

          <div>
            <p className="font-[var(--font-montserrat)] text-[#4A4A4A] text-xs uppercase tracking-wider mb-1">
              {hero.brand}
            </p>
            <h3 className="font-[var(--font-barlow)] font-semibold text-[#1C1C1C] text-base leading-tight mb-2">
              {hero.name}
            </h3>
            <span className="font-[var(--font-montserrat)] font-bold text-[#1C1C1C] text-sm">
              {formatPrice(hero.price)}
            </span>
          </div>
        </div>

        {/* Other items */}
        <div className="flex flex-col gap-4">
          {rest.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center mt-10">
        <a
          href="/lanzamientos"
          className="inline-block bg-[#E31C23] text-white font-[var(--font-barlow)] font-bold uppercase tracking-widest text-sm px-10 py-4 hover:bg-[#c51920] transition-colors duration-200"
        >
          Ver Todos los Lanzamientos
        </a>
      </div>
    </section>
  )
}
