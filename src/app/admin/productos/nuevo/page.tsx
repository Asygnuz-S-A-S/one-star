import { getCategories } from "@/server/services/category.service"
import { getAllBrands } from "@/server/services/brand.service"
import { getStoreLocations } from "@/server/services/store.service"
import { getColorPalette } from "@/server/services/product-color.service"
import ProductForm from "@/components/admin/ProductForm"

export default async function NuevoProductoPage() {
  const [categories, brands, stores, colorPalette] = await Promise.all([
    getCategories(),
    getAllBrands(),
    getStoreLocations(),
    getColorPalette(),
  ])

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C] mb-6">
        Nuevo producto
      </h1>
      <ProductForm
        mode="create"
        categories={categories}
        brands={brands}
        stores={stores}
        colorPalette={colorPalette}
      />
    </div>
  )
}
