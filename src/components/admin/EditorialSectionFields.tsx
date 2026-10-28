"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- LandingSection config is legacy JSON. */

import { useState } from "react"

import { EDITORIAL_APPEARANCES, EDITORIAL_DESTINATIONS } from "@/lib/editorial-builder-form"
import type { CampaignHeroSlide, EditorialAppearance } from "@/lib/editorial-config"

type Config = Record<string, any>
type Update = (next: Config) => void

type Props = {
  config: Config
  onChange: Update
  onPickMedia: (apply: (url: string) => void, title: string) => void
  collectionTargets?: Array<{ id: string; label: string; href?: string }>
}

const input = "w-full p-2 border border-gray-300 rounded text-sm bg-white focus:ring-2 focus:ring-[#E31C23] focus:outline-none"
const label = "block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider"

function Destination({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return <>
    <label htmlFor={id} className={label}>Destino</label>
    <input id={id} list="editorial-destinations" value={value} onChange={(event) => onChange(event.target.value)} className={input} />
    <datalist id="editorial-destinations">{EDITORIAL_DESTINATIONS.map(([href, name]) => <option key={href} value={href}>{name}</option>)}</datalist>
    <p className="mt-1 text-xs text-gray-500">Elige una ruta interna. Una URL https se señalará como externa.</p>
  </>
}

function Appearance({ value, onChange }: { value: EditorialAppearance; onChange: (value: EditorialAppearance) => void }) {
  return <div>
    <label className={label}>Apariencia</label>
    <div className="grid grid-cols-3 gap-2">{EDITORIAL_APPEARANCES.map(({ value: option, label: optionLabel }) => (
      <button key={option} type="button" onClick={() => onChange(option)} className={`min-h-11 rounded border px-2 text-xs font-bold ${value === option ? "border-[#E31C23] bg-[#1C1C1C] text-white" : "border-gray-300 bg-white text-gray-700"}`}>
        {optionLabel}
      </button>
    ))}</div>
  </div>
}

function Media({ label: mediaLabel, media, onChange, onPickMedia, required = false }: { label: string; media?: { src?: string; alt?: string }; onChange: (media?: { src: string; alt: string }) => void; onPickMedia: Props["onPickMedia"]; required?: boolean }) {
  const set = (patch: Partial<{ src: string; alt: string }>) => onChange({ src: media?.src ?? "", alt: media?.alt ?? "", ...patch })
  return <fieldset className="rounded-lg border border-gray-200 p-3 space-y-2">
    <legend className="px-1 text-xs font-bold text-gray-700">{mediaLabel}{required ? " *" : ""}</legend>
    <div className="flex gap-2"><input aria-label={`${mediaLabel} URL`} value={media?.src ?? ""} onChange={(event) => set({ src: event.target.value })} placeholder="URL de imagen" required={required} className={input} /><button type="button" onClick={() => onPickMedia((src) => set({ src }), `Seleccionar ${mediaLabel}`)} className="min-h-11 shrink-0 rounded border border-gray-300 px-3 text-xs font-bold">Biblioteca</button></div>
    <input aria-label={`Texto alternativo de ${mediaLabel}`} value={media?.alt ?? ""} onChange={(event) => set({ alt: event.target.value })} placeholder="Texto alternativo descriptivo" required={required} className={input} />
  </fieldset>
}

export function CampaignHeroFields({ config, onChange, onPickMedia }: Props) {
  const existingSlides = Array.isArray(config.slides) ? config.slides as CampaignHeroSlide[] : []
  const legacySlide: CampaignHeroSlide = {
    id: "campaign-1", accent: (config.accent ?? "carbon") as EditorialAppearance,
    headline: config.headline ?? "Nueva campaña", primaryCta: config.primaryCta ?? { label: "Ver colección", href: "/productos" },
    ...(config.copy ? { copy: config.copy } : {}), ...(config.eyebrow ? { eyebrow: config.eyebrow } : {}),
    ...(config.secondaryCta ? { secondaryCta: config.secondaryCta } : {}), ...(config.desktopMedia ? { desktopMedia: config.desktopMedia } : {}),
    ...(config.tabletMedia ? { tabletMedia: config.tabletMedia } : {}), ...(config.mobileMedia ? { mobileMedia: config.mobileMedia } : {}),
    ...(config.foregroundMedia ? { foregroundMedia: config.foregroundMedia } : {}),
  }
  const slides = existingSlides.length ? existingSlides : [legacySlide]
  const [selected, setSelected] = useState(0)
  const selectedIndex = Math.min(selected, slides.length - 1)
  const saveSlides = (next: CampaignHeroSlide[]) => onChange({ version: 1, kind: "campaignHero", slides: next })
  const updateSlide = (next: Record<string, any>) => saveSlides(slides.map((slide, index) => index === selectedIndex ? { ...next, id: slide.id } as CampaignHeroSlide : slide))
  const newSlide = (): CampaignHeroSlide => ({ id: `campaign-${Date.now()}`, accent: "carbon", headline: "Nueva campaña", primaryCta: { label: "Ver colección", href: "/productos" } })
  const move = (direction: -1 | 1) => {
    const target = selectedIndex + direction
    if (target < 0 || target >= slides.length) return
    const next = [...slides]; [next[selectedIndex], next[target]] = [next[target], next[selectedIndex]]
    saveSlides(next); setSelected(target)
  }
  return <div className="space-y-4">
    <div className="rounded-lg border border-[#E31C23]/30 bg-red-50 p-3 text-sm text-red-950"><strong>Campaña.</strong> Cada imagen tiene versión de escritorio, tablet y móvil, un texto y un botón. La primera se muestra de inmediato; las demás rotan.</div>
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-bold text-gray-900">Slides de campaña</h4><button type="button" disabled={slides.length >= 8} onClick={() => { saveSlides([...slides, newSlide()]); setSelected(slides.length) }} className="min-h-11 rounded bg-[#1C1C1C] px-3 text-xs font-bold text-white disabled:opacity-40">+ Añadir slide</button></div>
      <div className="space-y-2">{slides.map((slide, index) => <div key={slide.id} className={`flex items-center gap-2 rounded border p-2 ${index === selectedIndex ? "border-[#E31C23] bg-white" : "border-gray-200 bg-white/60"}`}>
        <button type="button" onClick={() => setSelected(index)} aria-pressed={index === selectedIndex} className="min-h-11 min-w-0 flex-1 text-left text-xs font-bold"><span className="mr-2 text-[#E31C23]">{index + 1}.</span>{slide.headline}</button>
        <button type="button" aria-label={`Subir slide ${index + 1}`} disabled={index === 0} onClick={() => move(-1)} className="min-h-11 min-w-11 rounded border disabled:opacity-30">↑</button>
        <button type="button" aria-label={`Bajar slide ${index + 1}`} disabled={index === slides.length - 1} onClick={() => move(1)} className="min-h-11 min-w-11 rounded border disabled:opacity-30">↓</button>
        <button type="button" aria-label={`Eliminar slide ${index + 1}`} disabled={slides.length === 1} onClick={() => { const next = slides.filter((_, itemIndex) => itemIndex !== index); saveSlides(next); setSelected(Math.max(0, Math.min(selectedIndex, next.length - 1))) }} className="min-h-11 min-w-11 rounded border border-red-200 text-red-700 disabled:opacity-30">×</button>
      </div>)}</div>
    </div>
    <CampaignHeroSlideFields config={slides[selectedIndex] as unknown as Config} onChange={updateSlide} onPickMedia={onPickMedia} />
  </div>
}

export function CampaignHeroSlideFields({ config, onChange, onPickMedia }: Props) {
  const cta = config.primaryCta ?? { label: "Ver colección", href: "/productos" }
  const secondary = config.secondaryCta
  return <div className="space-y-4">
    <div className="space-y-3 border-t pt-4">
      <div>
        <h4 className="text-sm font-bold text-gray-900">Imágenes adaptadas por pantalla</h4>
        <p className="mt-1 text-xs text-gray-600">Selecciona las tres versiones de la misma campaña. La tienda mostrará Web desde 1024 px, Tablet entre 641–1023 px y Móvil hasta 640 px. En campañas ya publicadas sin las tres imágenes, se reutiliza la disponible.</p>
      </div>
      <Media label="Imagen Web / escritorio" media={config.desktopMedia} onChange={(desktopMedia) => onChange({ ...config, desktopMedia })} onPickMedia={onPickMedia} required />
      <Media label="Imagen Tablet" media={config.tabletMedia} onChange={(tabletMedia) => onChange({ ...config, tabletMedia })} onPickMedia={onPickMedia} required />
      <Media label="Imagen Móvil" media={config.mobileMedia} onChange={(mobileMedia) => onChange({ ...config, mobileMedia })} onPickMedia={onPickMedia} required />
    </div>
    <div><label className={label}>Etiqueta</label><input value={config.eyebrow ?? ""} onChange={(event) => onChange({ ...config, eyebrow: event.target.value })} className={input} placeholder="NUEVA TEMPORADA" /></div>
    <div><label className={label}>Titular *</label><input required value={config.headline ?? ""} onChange={(event) => onChange({ ...config, headline: event.target.value })} className={input} placeholder="Tenis para ir más lejos" /></div>
    <div><label className={label}>Texto de apoyo</label><textarea value={config.copy ?? ""} onChange={(event) => onChange({ ...config, copy: event.target.value })} className={input} rows={3} /></div>
    <Appearance value={(config.accent ?? "carbon") as EditorialAppearance} onChange={(accent) => onChange({ ...config, accent })} />
    <div className="grid gap-3 sm:grid-cols-2"><div><label className={label}>Botón principal *</label><input required value={cta.label} onChange={(event) => onChange({ ...config, primaryCta: { ...cta, label: event.target.value } })} className={input} placeholder="Comprar colección" /></div><div><Destination id="campaign-primary-destination" value={cta.href} onChange={(href) => onChange({ ...config, primaryCta: { ...cta, href } })} /></div></div>
    <div className="border-t pt-3"><label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(secondary)} onChange={(event) => onChange({ ...config, ...(event.target.checked ? { secondaryCta: { label: "Ver más", href: "/productos" } } : { secondaryCta: undefined }) })} />Añadir un segundo botón</label>{secondary && <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><label className={label}>Segundo botón</label><input value={secondary.label} onChange={(event) => onChange({ ...config, secondaryCta: { ...secondary, label: event.target.value } })} className={input} /></div><div><Destination id="campaign-secondary-destination" value={secondary.href} onChange={(href) => onChange({ ...config, secondaryCta: { ...secondary, href } })} /></div></div>}</div>
    <Media label="Producto en primer plano" media={config.foregroundMedia} onChange={(foregroundMedia) => onChange({ ...config, foregroundMedia })} onPickMedia={onPickMedia} />
    <p className="-mt-2 text-xs text-gray-500">Opcional. Un PNG sin fondo. Si no hay imágenes de fondo, el producto se muestra grande sobre el titular.</p>
    <div>
      <label className={label}>Fotos del giro, una dirección por línea</label>
      <textarea
        value={Array.isArray(config.angles) ? config.angles.map((item: { src?: string }) => item.src ?? "").filter(Boolean).join("\n") : ""}
        onChange={(event) => {
          const angles = event.target.value.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 12).map((src) => ({ src, alt: config.headline || "Producto" }))
          onChange({ ...config, angles: angles.length ? angles : undefined })
        }}
        rows={4}
        className={input}
        placeholder="https://.../frente.png"
      />
      <p className="mt-1 text-xs text-gray-500">Con dos o más fotos del mismo zapato, en orden, el escenario las recorre. Una sola foto no se convierte en un video 3D.</p>
    </div>
  </div>
}

/** Actualiza el tile de una tarjeta sin tocar los demás (o lo agrega si aún no existe). */
export function upsertTile(tiles: Config[], id: string, patch: Config): Config[] {
  const current = tiles.find((item) => item.id === id) ?? { id, appearance: "carbon" }
  const next = { ...current, ...patch }
  return tiles.some((item) => item.id === id) ? tiles.map((item) => item.id === id ? next : item) : [...tiles, next]
}

export function CollectionTileFields({ config, onChange, onPickMedia, collectionTargets = [] }: Props) {
  const tiles: Config[] = Array.isArray(config.tiles) ? config.tiles : []
  const [selectedId, setSelectedId] = useState<string>(tiles[0]?.id ?? collectionTargets[0]?.id ?? "coleccion")
  const target = collectionTargets.find((item) => item.id === selectedId)
  // Cada tarjeta guarda su propio tile; sin título ni destino propios se usan los de la grilla.
  const tile = tiles.find((item) => item.id === selectedId) ?? { id: selectedId, appearance: "carbon" }
  const update = (patch: Record<string, unknown>) => onChange({ ...config, tiles: upsertTile(tiles, selectedId, patch) })
  return <div className="space-y-4">
    <div className="rounded-lg border border-[#E31C23]/30 bg-red-50 p-3 text-sm text-red-950"><strong>Tarjeta de colección.</strong> Elige cada tarjeta y asígnale imagen y apariencia. Si dejas el título o el destino vacíos se usan los de la grilla.</div>
    {collectionTargets.length > 0 && <div><label className={label} htmlFor="collection-tile-target">Tarjeta de colección</label><select id="collection-tile-target" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className={input}>{collectionTargets.map((item) => <option key={item.id} value={item.id}>{item.label}{tiles.some((saved) => saved.id === item.id && saved.media) ? " ✓" : ""}</option>)}</select></div>}
    <div><label className={label}>Título</label><input value={tile.title ?? ""} onChange={(event) => update({ title: event.target.value || undefined })} className={input} placeholder={target?.label ?? "Accesorios"} /></div>
    <div><Destination id="collection-destination" value={tile.href ?? target?.href ?? "/productos"} onChange={(href) => update({ href })} /></div>
    <Appearance value={(tile.appearance ?? "carbon") as EditorialAppearance} onChange={(appearance) => update({ appearance })} />
    <Media label="Imagen de colección" media={tile.media} onChange={(media) => update({ media })} onPickMedia={onPickMedia} />
  </div>
}
