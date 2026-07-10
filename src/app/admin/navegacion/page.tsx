import React from "react"
import { prisma } from "@/server/db/prisma"
import NavigationManager from "@/components/admin/NavigationManager"

export const metadata = {
  title: "Navegación | Admin One Star",
}

export default async function NavigationPage() {
  const items = await prisma.navigationItem.findMany({
    orderBy: { position: "asc" }
  })

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-[var(--font-barlow)] text-[#1C1C1C]">
          Gestor del Menú Principal
        </h1>
        <p className="text-gray-500 mt-2 font-[var(--font-montserrat)]">
          Arrastra los enlaces para cambiar el orden en la barra de navegación de la tienda. 
          Aquí es donde debes agregar las rutas de las nuevas categorías que crees (ej. <code>/c/zapatos-rojos</code>).
        </p>
      </div>

      <NavigationManager initialItems={items} />
    </div>
  )
}
