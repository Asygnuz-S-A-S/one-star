import { prisma } from "@/server/db/prisma"
import ProductForm from "@/components/admin/ProductForm"

export default async function NuevoProductoPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C] mb-6">
        Nuevo producto
      </h1>
      <ProductForm mode="create" categories={categories} />
    </div>
  )
}
