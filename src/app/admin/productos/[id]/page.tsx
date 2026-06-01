/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: Some Product/Variant fields are in schema.prisma but not yet in the
// generated Prisma client — will resolve after `prisma generate`.
import { notFound } from "next/navigation"
import { prisma } from "@/server/db/prisma"
import ProductForm from "@/components/admin/ProductForm"
import type { ProductWithRelations } from "@/types/admin"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params

  const db = prisma as any

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        variants: { orderBy: { sku: "asc" } },
        crossSells: {
          select: { id: true, name: true, brand: true, slug: true, basePrice: true },
        },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ])

  if (!product) notFound()

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C] mb-6">
        Editar producto
      </h1>
      <ProductForm mode="edit" product={product as ProductWithRelations} categories={categories} />
    </div>
  )
}
