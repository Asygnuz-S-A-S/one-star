import type { Metadata } from "next"
import Link from "next/link"
import { requireAdmin } from "@/server/auth/require-admin"
import {
  ANALYTICS_WINDOWS,
  getAnalyticsDashboard,
  parseAnalyticsWindow,
} from "@/server/services/web-analytics.service"

export const metadata: Metadata = {
  title: "Analítica | Admin One Star",
}

export const dynamic = "force-dynamic"

const numero = new Intl.NumberFormat("es-CO")

const ETIQUETA_VENTANA: Record<number, string> = {
  1: "Hoy",
  7: "7 días",
  30: "30 días",
}

function Tarjeta({ titulo, valor, pie }: { titulo: string; valor: string; pie?: string }) {
  return (
    <div className="rounded-store-sm border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <p className="font-montserrat text-xs uppercase tracking-widest text-[#4A4A4A] dark:text-white/60">
        {titulo}
      </p>
      <p className="mt-2 font-barlow text-3xl font-extrabold text-[#1C1C1C] dark:text-white">{valor}</p>
      {pie && <p className="mt-1 font-montserrat text-xs text-[#4A4A4A] dark:text-white/60">{pie}</p>}
    </div>
  )
}

function Panel({
  titulo,
  descripcion,
  children,
}: {
  titulo: string
  descripcion?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-store-sm border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <h2 className="font-barlow text-sm font-bold uppercase tracking-widest text-[#1C1C1C] dark:text-white">
        {titulo}
      </h2>
      {descripcion && (
        <p className="mt-1 font-montserrat text-xs text-[#4A4A4A] dark:text-white/60">{descripcion}</p>
      )}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center font-montserrat text-sm text-[#4A4A4A] dark:text-white/50">{children}</p>
  )
}

function Tabla({ filas }: { filas: { clave: string; etiqueta: React.ReactNode; valor: string }[] }) {
  return (
    <ul className="divide-y divide-black/5 dark:divide-white/10">
      {filas.map((fila) => (
        <li key={fila.clave} className="flex items-center justify-between gap-3 py-2">
          <span className="min-w-0 truncate font-montserrat text-sm text-[#1C1C1C] dark:text-white/90">
            {fila.etiqueta}
          </span>
          <span className="shrink-0 font-barlow text-sm font-bold text-[#1C1C1C] dark:text-white">
            {fila.valor}
          </span>
        </li>
      ))}
    </ul>
  )
}

interface PageProps {
  searchParams: Promise<{ dias?: string }>
}

export default async function AdminAnaliticaPage({ searchParams }: PageProps) {
  await requireAdmin()
  const { dias } = await searchParams
  const ventana = parseAnalyticsWindow(dias)
  const datos = await getAnalyticsDashboard(ventana)
  const { summary, funnel } = datos

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-barlow text-2xl font-extrabold uppercase tracking-tight text-[#1C1C1C] md:text-3xl dark:text-white">
            Analítica de la tienda
          </h1>
          <p className="mt-1 font-montserrat text-sm text-[#4A4A4A] dark:text-white/60">
            Medición propia, sin terceros. No se guarda IP ni user-agent completo.
          </p>
        </div>
        <nav className="flex gap-1 rounded-full border border-black/10 p-1 dark:border-white/10">
          {ANALYTICS_WINDOWS.map((dias) => (
            <Link
              key={dias}
              href={`/admin/analitica?dias=${dias}`}
              className={`rounded-full px-3 py-1 font-barlow text-xs font-bold uppercase tracking-widest transition ${
                dias === ventana
                  ? "bg-[#1C1C1C] text-white dark:bg-white dark:text-black"
                  : "text-[#4A4A4A] hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
              }`}
            >
              {ETIQUETA_VENTANA[dias]}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta titulo="Personas" valor={numero.format(summary.visitors)} pie="Visitantes únicos" />
        <Tarjeta titulo="Visitas" valor={numero.format(summary.sessions)} pie="Sesiones" />
        <Tarjeta titulo="Páginas vistas" valor={numero.format(summary.events)} />
        <Tarjeta
          titulo="Fichas de producto"
          valor={numero.format(summary.productViews)}
          pie="Vistas de producto"
        />
      </div>

      <Panel
        titulo="Embudo"
        descripcion="Personas distintas que llegaron a cada paso dentro de la ventana elegida."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Tarjeta titulo="Vieron producto" valor={numero.format(funnel.productViewers)} />
          <Tarjeta
            titulo="Fueron a pagar"
            valor={numero.format(funnel.checkoutStarters)}
            pie={`${funnel.viewToCheckout}% de quienes vieron`}
          />
          <Tarjeta
            titulo="Compraron"
            valor={numero.format(funnel.buyers)}
            pie={`${funnel.checkoutToPurchase}% de quienes fueron a pagar · ${funnel.viewToPurchase}% del total`}
          />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Productos más vistos">
          {datos.topProducts.length === 0 ? (
            <Vacio>Todavía no hay vistas de producto en esta ventana.</Vacio>
          ) : (
            <Tabla
              filas={datos.topProducts.map((producto) => ({
                clave: producto.slug,
                etiqueta: (
                  <Link href={`/productos/${producto.slug}`} className="hover:underline">
                    {producto.slug}
                  </Link>
                ),
                valor: `${numero.format(producto.views)} vistas · ${numero.format(producto.people)} personas`,
              }))}
            />
          )}
        </Panel>

        <Panel
          titulo="Vieron y no compraron"
          descripcion="La lista accionable para retargeting: personas que miraron la ficha y no llegaron a comprar."
        >
          {datos.viewedNotPurchased.length === 0 ? (
            <Vacio>Sin datos todavía.</Vacio>
          ) : (
            <Tabla
              filas={datos.viewedNotPurchased.map((fila) => ({
                clave: fila.slug,
                etiqueta: (
                  <Link href={`/productos/${fila.slug}`} className="hover:underline">
                    {fila.slug}
                  </Link>
                ),
                valor: `${numero.format(fila.visits)} personas`,
              }))}
            />
          )}
        </Panel>

        <Panel titulo="Categorías más vistas">
          {datos.topCategories.length === 0 ? (
            <Vacio>Sin datos todavía.</Vacio>
          ) : (
            <Tabla
              filas={datos.topCategories.map((fila) => ({
                clave: fila.slug,
                etiqueta: fila.slug,
                valor: numero.format(fila.visits),
              }))}
            />
          )}
        </Panel>

        <Panel titulo="Filtros más usados" descripcion="Qué talla, color o marca busca la gente.">
          {datos.topFilters.length === 0 ? (
            <Vacio>Sin datos todavía.</Vacio>
          ) : (
            <Tabla
              filas={datos.topFilters.map((fila) => ({
                clave: `${fila.key}:${fila.value}`,
                etiqueta: `${fila.key}: ${fila.value}`,
                valor: numero.format(fila.uses),
              }))}
            />
          )}
        </Panel>

        <Panel titulo="Búsquedas" descripcion="Lo que la gente escribe en el buscador.">
          {datos.topSearches.length === 0 ? (
            <Vacio>Sin búsquedas en esta ventana.</Vacio>
          ) : (
            <Tabla
              filas={datos.topSearches.map((fila) => ({
                clave: fila.term,
                etiqueta: fila.term,
                valor: numero.format(fila.searches),
              }))}
            />
          )}
        </Panel>

        <Panel titulo="De dónde llegan" descripcion="Primer toque de cada visitante nuevo (UTM o referente).">
          {datos.trafficSources.length === 0 ? (
            <Vacio>Sin visitantes nuevos en esta ventana.</Vacio>
          ) : (
            <Tabla
              filas={datos.trafficSources.map((fila) => ({
                clave: `${fila.source}:${fila.medium ?? ""}`,
                etiqueta: fila.medium ? `${fila.source} · ${fila.medium}` : fila.source,
                valor: numero.format(fila.visitors),
              }))}
            />
          )}
        </Panel>
      </div>

      <p className="font-montserrat text-xs text-[#4A4A4A] dark:text-white/50">
        Nota: &quot;Añadir al carrito&quot; todavía no se registra en la medición propia — el evento se
        clasifica por ruta y agregar al carrito no cambia la URL. Para el píxel de Meta sí se envía.
      </p>
    </div>
  )
}
