import { notFound } from "next/navigation"
import { getProductByIdForAdmin } from "@/server/services/product.service"
import { getCategories } from "@/server/services/category.service"
import { getAllBrands } from "@/server/services/brand.service"
import { getStoreLocations } from "@/server/services/store.service"
import { getColorPalette } from "@/server/services/product-color.service"
import ProductForm from "@/components/admin/ProductForm"
import type { ProductWithRelations } from "@/types/admin"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params

  const [product, categories, brands, stores, colorPalette] = await Promise.all([
    getProductByIdForAdmin(id),
    getCategories(),
    getAllBrands(),
    getStoreLocations(),
    getColorPalette(),
  ])

  if (!product) notFound()

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C] mb-6">
        Editar producto
      </h1>
      <ProductForm
        mode="edit"
        product={product as unknown as ProductWithRelations}
        categories={categories}
        brands={brands}
        stores={stores}
        colorPalette={colorPalette}
      />
    </div>
  )
}
