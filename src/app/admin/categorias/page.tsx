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
        <h1 className="text-3xl font-bold font-barlow text-[#1C1C1C]">
          Categorías de la tienda
        </h1>
        <p className="text-gray-500 mt-2 font-montserrat">
          El tipo de producto que ve el cliente: tenis, chanclas, accesorios.
          Cada categoría abre su propia página en la tienda.
        </p>
        <details className="mt-3 text-sm text-gray-500 font-montserrat">
          <summary className="cursor-pointer font-semibold text-[#1C1C1C]">Cómo se conecta con Loggro</summary>
          <p className="mt-2">
            En Loggro el campo «Categoría» es la marca (Converse, Nike, Vans). Aquí no se edita eso:
            la dirección de cada categoría queda en la columna «Dirección en la tienda».
          </p>
        </details>
      </div>

      <CategoryManager initialCategories={categories} />
    </div>
  )
}
