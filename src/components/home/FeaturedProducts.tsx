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
  { id: "1", name: "Air Max 90", brand: "Nike", price: 450000, salePrice: 360000, isOnSale: true },
  { id: "2", name: "Fresh Foam 1080", brand: "New Balance", price: 580000, isNew: true },
  { id: "3", name: "Clifton 9", brand: "Hoka", price: 620000 },
  { id: "4", name: "Cloud X 3", brand: "On Running", price: 720000, isNew: true },
  { id: "5", name: "990v6", brand: "New Balance", price: 850000 },
  { id: "6", name: "Ultraboost 23", brand: "Adidas", price: 480000, salePrice: 380000, isOnSale: true },
  { id: "7", name: "Gel-Nimbus 25", brand: "Asics", price: 520000 },
  { id: "8", name: "Séville Leather", brand: "Veja", price: 380000, isNew: true },
]

export default function FeaturedProducts() {
  return (
    <section className="px-4 md:px-8 lg:px-16 py-12 md:py-16">
      {/* Section header */}
      <div className="mb-8 md:mb-12">
        <h2 className="font-[var(--font-barlow)] font-black uppercase text-3xl md:text-4xl text-[#1C1C1C] tracking-tight leading-none">
          Destacados
        </h2>
        <div className="w-12 h-1 bg-[#E31C23] mt-3" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {MOCK_PRODUCTS.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mt-10">
        <a
          href="/productos"
          className="inline-block border-2 border-[#1C1C1C] text-[#1C1C1C] font-[var(--font-barlow)] font-bold uppercase tracking-widest text-sm px-10 py-4 hover:bg-[#1C1C1C] hover:text-white transition-colors duration-200"
        >
          Ver Todos los Productos
        </a>
      </div>
    </section>
  )
}
