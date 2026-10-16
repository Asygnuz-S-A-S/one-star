import { ReactNode } from "react"

interface ShopLayoutProps {
  sidebar: ReactNode
  children: ReactNode
}

/**
 * Wrapper reutilizable para páginas de listado.
 * Desktop: sidebar fijo de 280px + contenido flexible.
 * Móvil: el aside no ocupa espacio, pero SÍ se renderiza: dentro vive el botón
 * flotante que abre el panel de filtros (HU-9). Ocultarlo aquí con `hidden`
 * dejaba el catálogo móvil sin filtros ni orden.
 */
export default function ShopLayout({ sidebar, children }: ShopLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar — columna desde md; en móvil solo aporta el botón flotante */}
      <aside className="md:w-72 md:shrink-0 md:border-r border-[#E0E0E0] dark:border-white/10 md:px-4 md:py-8">
        {sidebar}
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
