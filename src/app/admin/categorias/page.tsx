import React from "react"
import { findManyCategories } from "@/server/repositories/category.repository"
import CategoryManager from "@/components/admin/CategoryManager"

export const metadata = {
  title: "Categorías | Admin One Star",
}

export default async function CategoriesPage() {
  const categories = await findManyCategories()

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-[var(--font-barlow)] text-[#1C1C1C]">
          Gestor de Categorías (Slugs)
        </h1>
        <p className="text-gray-500 mt-2 font-[var(--font-montserrat)]">
          Crea nuevas categorías y genera automáticamente sus rutas en la tienda.
          Las rutas dinámicas se crean bajo <code>/c/[slug]</code>.
        </p>
      </div>

      <CategoryManager initialCategories={categories} />
    </div>
  )
}
