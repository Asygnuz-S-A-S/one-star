"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
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

const pageLabel = (page: string) => page === "home"
  ? "Inicio"
  : page.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
const pagePath = (page: string) => page === "home" ? "/" : `/campanas/${page}`
const DESKTOP_PREVIEW_WIDTH = 1280

function campaignSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

/** The builder is a workspace: preview controls and exit are always separate from section navigation. */
export default function VisualBuilderContainer({ actions, initialSections, initialGlobals, initialBanners, initialGridBlocks, categories, unavailableAreas, dataVersion, page, pages }: VisualBuilderContainerProps) {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)
  const [previewAnchor, setPreviewAnchor] = useState("")
  const [draftCount, setDraftCount] = useState(0)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState("")
  const [newPage, setNewPage] = useState("")
  const [newPageError, setNewPageError] = useState("")
  const previewPath = pagePath(page)
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageWidth, setStageWidth] = useState(DESKTOP_PREVIEW_WIDTH)
  const nextSlug = campaignSlug(newPage)

  const openNewPage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (nextSlug === "home" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) {
      setNewPageError("Escribe un nombre, por ejemplo HOKA running")
      return
    }
    setNewPageError("")
    setNewPage("")
    router.push(`/admin/landing-builder?page=${nextSlug}`)
  }
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop")
  const [mobilePanel, setMobilePanel] = useState<"editor" | "preview">("editor")
  const previewLabel = `Vista previa ${previewDevice === "mobile" ? "móvil" : "de escritorio"}`
  const desktopScale = previewDevice === "mobile" || stageWidth < 320 ? 1 : Math.min(1, stageWidth / DESKTOP_PREVIEW_WIDTH)

  const handleRefresh = (anchorId?: string) => {
    setPreviewAnchor(anchorId ?? "")
    setRefreshKey(current => current + 1)
  }
  const handleDraftCount = useCallback((count: number) => setDraftCount(count), [])

  const publish = async () => {
    setIsPublishing(true)
    setPublishError("")
    const result = await actions.publishLandingPageAction(page)
    setIsPublishing(false)
    if (!result.success) {
      setPublishError(result.error ?? "No se pudo publicar")
      return
    }
    setDraftCount(0)
    router.refresh()
    handleRefresh(previewAnchor)
  }

  useEffect(() => {
    const id = window.location.hash.replace("#", "")
    if (!id) return
    document.getElementById(id)?.scrollIntoView({ block: "nearest" })
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => setStageWidth(stage.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [previewDevice, mobilePanel])

  const previewSrc = `${previewPath}?preview=true${refreshKey > 0 ? `&t=${refreshKey}` : ""}${previewAnchor ? `#landing-section-${previewAnchor}` : ""}`

  return (
    <main className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#eef0f2]" aria-label="Constructor visual de landings">
      <header className="flex min-h-16 shrink-0 flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="min-w-0">
          <nav aria-label="Ruta del constructor" className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
            <span>Administración</span><span aria-hidden="true">/</span><span className="text-[#1C1C1C]">Constructor visual</span>
          </nav>
          <h1 className="font-barlow text-xl font-black uppercase tracking-[-0.03em] text-[#1C1C1C]">{pageLabel(page)}</h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href={previewPath} target="_blank" rel="noreferrer" className="hidden min-h-11 items-center rounded-md border border-gray-300 px-3 text-xs font-bold text-[#1C1C1C] hover:bg-gray-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E31C23] sm:inline-flex">Abrir tienda</Link>
          <button type="button" onClick={() => handleRefresh(previewAnchor)} className="min-h-11 rounded-md border border-gray-300 px-3 text-xs font-bold text-[#1C1C1C] hover:bg-gray-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E31C23]">Actualizar vista previa</button>
          <button type="button" onClick={publish} disabled={isPublishing || draftCount === 0} className="min-h-11 rounded-md bg-[#E31C23] px-3 text-xs font-bold text-white hover:bg-[#c01018] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E31C23]">{isPublishing ? "Publicando..." : `Publicar en ${pageLabel(page)}`}</button>
          <Link href="/admin" className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-[#1C1C1C] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E31C23]">Salir al panel</Link>
        </div>
      </header>
      {publishError && <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">{publishError}</p>}

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
            <form onSubmit={openNewPage} className="mt-2 flex gap-2" aria-label="Crear campaña">
              <input
                value={newPage}
                onChange={(event) => setNewPage(event.target.value)}
                placeholder="HOKA running"
                aria-label="Nombre de la campaña"
                aria-invalid={newPageError ? true : undefined}
                aria-describedby={newPageError ? "new-landing-error" : nextSlug ? "new-landing-path" : undefined}
                className="min-h-11 min-w-0 flex-1 border px-3 text-sm"
              />
              <button type="submit" className="min-h-11 rounded-md border border-gray-300 px-3 text-xs font-bold text-[#1C1C1C] hover:bg-gray-50">Crear</button>
            </form>
            {nextSlug && <p id="new-landing-path" className="mt-1 text-xs text-gray-500">Se publicará en /campanas/{nextSlug}</p>}
            {newPageError && <p id="new-landing-error" role="alert" className="mt-1 text-xs text-[#E31C23]">{newPageError}</p>}
            <p className="mt-2 text-xs text-gray-500">
              Guardar deja un borrador en la vista previa. Publicar lo pone en {page === "home" ? "Inicio" : pagePath(page)}.
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
              onDraftCount={handleDraftCount}
            />
          </div>
        </aside>

        <section className={`min-h-0 flex-1 bg-[#dfe2e5] ${mobilePanel === "editor" ? "hidden md:flex" : "flex"} flex-col`} aria-label="Vista previa">
          <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 bg-[#1C1C1C] px-3 py-2 text-xs font-medium text-gray-300">
            <span>{draftCount > 0 ? `${previewLabel}. Borrador, aún no está en la tienda.` : `${previewLabel}. Igual que la tienda publicada.`}</span>
            <div className="flex rounded border border-gray-600 p-0.5" aria-label="Formato de vista previa">
              <button type="button" onClick={() => setPreviewDevice("desktop")} aria-pressed={previewDevice === "desktop"} className={`min-h-11 rounded px-3 text-xs font-bold ${previewDevice === "desktop" ? "bg-white text-black" : "text-gray-300"}`}>Escritorio</button>
              <button type="button" onClick={() => setPreviewDevice("mobile")} aria-pressed={previewDevice === "mobile"} className={`min-h-11 rounded px-3 text-xs font-bold ${previewDevice === "mobile" ? "bg-white text-black" : "text-gray-300"}`}>Móvil</button>
            </div>
          </div>
          <div ref={stageRef} className="min-h-0 flex-1 overflow-hidden bg-white">
            {previewDevice === "mobile" ? (
              <div className="mx-auto h-full w-full max-w-[430px]">
                <iframe key={`${refreshKey}-mobile`} src={previewSrc} className="h-full w-full border-none" title={previewLabel} sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />
              </div>
            ) : (
              <iframe
                key={`${refreshKey}-desktop`}
                src={previewSrc}
                title={previewLabel}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                style={{ width: DESKTOP_PREVIEW_WIDTH, height: `${100 / desktopScale}%`, transform: `scale(${desktopScale})`, transformOrigin: "top left", border: "none" }}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
