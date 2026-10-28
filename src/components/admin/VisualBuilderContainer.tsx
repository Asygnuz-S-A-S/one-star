"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { LandingSection, HomeGridBlock } from "@prisma/client"
import type { BannerDTO } from "@/server/services/banner.service"
import type { CategoryDTO } from "@/server/services/category.service"
import LandingBuilderList, { type BuilderGlobals } from "@/components/admin/LandingBuilderList"
import Link from "next/link"
import type { LandingBuilderActions } from "@/types/landing-builder-actions"

interface VisualBuilderContainerProps {
  actions: LandingBuilderActions
  initialSections: LandingSection[]
  initialGlobals: BuilderGlobals
  initialBanners: BannerDTO[]
  initialGridBlocks: HomeGridBlock[]
  categories: CategoryDTO[]
  unavailableAreas: string[]
  dataVersion: string
  page: string
  pages: string[]
}

const pageLabel = (page: string) => page === "home" ? "Inicio" : `/campanas/${page}`
const pagePath = (page: string) => page === "home" ? "/" : `/campanas/${page}`

/** The builder is a workspace: preview controls and exit are always separate from section navigation. */
export default function VisualBuilderContainer({ actions, initialSections, initialGlobals, initialBanners, initialGridBlocks, categories, unavailableAreas, dataVersion, page, pages }: VisualBuilderContainerProps) {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)
  const [newPage, setNewPage] = useState("")
  const [newPageError, setNewPageError] = useState("")
  const previewPath = pagePath(page)

  const openNewPage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const slug = newPage.trim().toLowerCase()
    if (slug === "home" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
      setNewPageError("Usa minúsculas, números y guiones (ej. hoka-running)")
      return
    }
    setNewPageError("")
    setNewPage("")
    router.push(`/admin/landing-builder?page=${slug}`)
  }
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop")
  const [mobilePanel, setMobilePanel] = useState<"editor" | "preview">("editor")
  const previewLabel = `Vista previa ${previewDevice === "mobile" ? "móvil" : "de escritorio"}`

  const handleRefresh = () => setRefreshKey(current => current + 1)

  useEffect(() => {
    const id = window.location.hash.replace("#", "")
    if (!id) return
    document.getElementById(id)?.scrollIntoView({ block: "nearest" })
  }, [])

  return (
    <main className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#eef0f2]" aria-label="Constructor visual de landings">
      <header className="flex min-h-16 shrink-0 flex-col gap-3 border-b border-gray-200 bg-white py-3 pr-4 pl-16 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="min-w-0">
          <nav aria-label="Ruta del constructor" className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
            <span>Administración</span><span aria-hidden="true">/</span><span className="text-[#1C1C1C]">Constructor visual</span>
          </nav>
          <h1 className="font-barlow text-xl font-black uppercase tracking-[-0.03em] text-[#1C1C1C]">{pageLabel(page)} · editor visual</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={previewPath} target="_blank" rel="noreferrer" className="hidden min-h-11 items-center rounded-md border border-gray-300 px-3 text-xs font-bold text-[#1C1C1C] hover:bg-gray-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E31C23] sm:inline-flex">Abrir tienda</Link>
          <button type="button" onClick={handleRefresh} className="min-h-11 rounded-md bg-[#E31C23] px-3 text-xs font-bold text-white hover:bg-[#c01018] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E31C23]">Actualizar vista previa</button>
          <Link href="/admin" className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-[#1C1C1C] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E31C23]">Salir al panel</Link>
        </div>
      </header>

      <div className="flex shrink-0 border-b border-gray-200 bg-white p-2 md:hidden" role="tablist" aria-label="Panel del constructor">
        <button type="button" role="tab" aria-selected={mobilePanel === "editor"} onClick={() => setMobilePanel("editor")} className={`min-h-11 flex-1 rounded-md text-xs font-bold ${mobilePanel === "editor" ? "bg-[#1C1C1C] text-white" : "text-gray-600"}`}>Contenido</button>
        <button type="button" role="tab" aria-selected={mobilePanel === "preview"} onClick={() => setMobilePanel("preview")} className={`min-h-11 flex-1 rounded-md text-xs font-bold ${mobilePanel === "preview" ? "bg-[#1C1C1C] text-white" : "text-gray-600"}`}>Vista previa</button>
      </div>

      <div className="min-h-0 flex flex-1 md:flex-row">
        <aside className={`flex w-full shrink-0 flex-col border-r border-gray-200 bg-gray-50 md:w-[400px] ${mobilePanel === "preview" ? "hidden md:flex" : "flex"}`} aria-label="Contenido de la landing">
          <div className="border-b border-gray-200 bg-white px-4 py-3">
            <label htmlFor="landing-page-select" className="font-barlow text-sm font-black uppercase tracking-[0.08em] text-[#1C1C1C]">Landing que editas</label>
            <select
              id="landing-page-select"
              value={page}
              onChange={(event) => router.push(`/admin/landing-builder?page=${event.target.value}`)}
              className="mt-2 min-h-11 w-full border px-3 text-sm"
            >
              {pages.map((item) => <option key={item} value={item}>{pageLabel(item)}</option>)}
            </select>
            <form onSubmit={openNewPage} className="mt-2 flex gap-2" aria-label="Crear landing de campaña">
              <input
                value={newPage}
                onChange={(event) => setNewPage(event.target.value)}
                placeholder="nueva-campana"
                aria-label="Slug de la nueva landing"
                aria-invalid={newPageError ? true : undefined}
                aria-describedby={newPageError ? "new-landing-error" : undefined}
                className="min-h-11 min-w-0 flex-1 border px-3 text-sm"
              />
              <button type="submit" className="min-h-11 rounded-md border border-gray-300 px-3 text-xs font-bold text-[#1C1C1C] hover:bg-gray-50">Crear</button>
            </form>
            {newPageError && <p id="new-landing-error" role="alert" className="mt-1 text-xs text-[#E31C23]">{newPageError}</p>}
            <p className="mt-2 text-xs text-gray-500">
              {page === "home" ? "Configura, ordena y guarda. Los cambios se ven aquí antes de publicar." : `Se publica en ${previewPath} cuando tenga al menos una sección activa.`}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <LandingBuilderList
              key={dataVersion}
              actions={actions}
              initialSections={initialSections}
              initialGlobals={initialGlobals}
              initialBanners={initialBanners}
              initialGridBlocks={initialGridBlocks}
              categories={categories}
              unavailableAreas={unavailableAreas}
              onRefresh={handleRefresh}
            />
          </div>
        </aside>

        <section className={`min-h-0 flex-1 bg-[#dfe2e5] ${mobilePanel === "editor" ? "hidden md:flex" : "flex"} flex-col`} aria-label="Vista previa">
          <div className="flex min-h-12 items-center justify-between bg-[#1C1C1C] px-3 text-xs font-medium tracking-widest text-gray-300 uppercase">
            <span>{previewLabel} · los cambios no se publican solos</span>
            <div className="rounded border border-gray-600 p-0.5" aria-label="Formato de vista previa">
              <button type="button" onClick={() => setPreviewDevice("desktop")} aria-pressed={previewDevice === "desktop"} className={`min-h-8 rounded px-2 text-[10px] font-bold ${previewDevice === "desktop" ? "bg-white text-black" : "text-gray-300"}`}>Escritorio</button>
              <button type="button" onClick={() => setPreviewDevice("mobile")} aria-pressed={previewDevice === "mobile"} className={`min-h-8 rounded px-2 text-[10px] font-bold ${previewDevice === "mobile" ? "bg-white text-black" : "text-gray-300"}`}>Móvil</button>
            </div>
          </div>
          <div className={`min-h-0 flex-1 bg-white shadow-2xl ${previewDevice === "mobile" ? "mx-auto w-full max-w-[430px]" : "w-full"}`}>
            <iframe key={`${refreshKey}-${previewDevice}`} src={refreshKey > 0 ? `${previewPath}?preview=true&t=${refreshKey}` : `${previewPath}?preview=true`} className="h-full w-full border-none" title={previewLabel} sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />
          </div>
        </section>
      </div>
    </main>
  )
}
