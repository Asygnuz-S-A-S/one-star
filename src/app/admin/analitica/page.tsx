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

      <Panel
        titulo="Campañas (UTM)"
        descripcion="Rendimiento por utm_campaign dentro de la ventana: personas que entraron por cada campaña y cuántas llegaron a ver producto, checkout y compra."
      >
        {datos.utmCampaigns.length === 0 ? (
          <Vacio>
            Todavía no hay visitas con utm_campaign en esta ventana. Agrega{" "}
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">
              ?utm_source=...&amp;utm_medium=...&amp;utm_campaign=...
            </code>{" "}
            en los enlaces de tus campañas.
          </Vacio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-black/10 font-montserrat text-[11px] uppercase tracking-wider text-[#4A4A4A] dark:border-white/10 dark:text-white/60">
                  <th className="py-2 pr-4 font-semibold">Campaña</th>
                  <th className="px-3 py-2 text-right font-semibold">Visitantes</th>
                  <th className="px-3 py-2 text-right font-semibold">Vieron producto</th>
                  <th className="px-3 py-2 text-right font-semibold">Checkout</th>
                  <th className="px-3 py-2 text-right font-semibold">Compras</th>
                  <th className="py-2 pl-3 text-right font-semibold">Conversión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-montserrat text-sm dark:divide-white/10">
                {datos.utmCampaigns.map((fila) => {
                  const origen = [fila.source, fila.medium].filter(Boolean).join(" · ")
                  return (
                    <tr key={`${fila.campaign}:${fila.source ?? ""}:${fila.medium ?? ""}`}>
                      <td className="py-2.5 pr-4">
                        <p className="font-semibold text-[#1C1C1C] dark:text-white">{fila.campaign}</p>
                        {origen && (
                          <p className="text-xs text-[#4A4A4A] dark:text-white/60">{origen}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-barlow font-bold text-[#1C1C1C] dark:text-white">
                        {numero.format(fila.visitors)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[#4A4A4A] dark:text-white/80">
                        {numero.format(fila.productViewers)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[#4A4A4A] dark:text-white/80">
                        {numero.format(fila.checkoutStarters)}
                        <span className="ml-1 text-xs text-[#4A4A4A]/70 dark:text-white/50">
                          ({fila.visitToCheckout}%)
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-barlow font-bold text-[#1C1C1C] dark:text-white">
                        {numero.format(fila.buyers)}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 font-barlow text-xs font-bold ${
                            fila.buyers > 0
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-black/5 text-[#4A4A4A] dark:bg-white/10 dark:text-white/60"
                          }`}
                        >
                          {fila.visitToPurchase}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
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
