import { ReactNode } from "react"

interface ShopLayoutProps {
  sidebar: ReactNode
  children: ReactNode
}

/**
 * Wrapper reutilizable para páginas de listado.
 * Desktop: sidebar fijo de 280px + contenido flexible.
 * Móvil: solo children (el sidebar se muestra como drawer desde FilterSidebar).
 */
export default function ShopLayout({ sidebar, children }: ShopLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar — oculto en móvil, visible desde md */}
      <aside className="hidden md:block w-72 shrink-0 border-r border-[#E0E0E0] dark:border-white/10 px-4 py-8">
        {sidebar}
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
