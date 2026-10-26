"use client"

import React, { useState, useTransition } from "react"
import type { BrandDetailDTO, BrandDTO } from "@/server/services/brand.service"
import { createBrandAction, updateBrandAction, deleteBrandAction } from "@/app/admin/marcas/actions"
import { faqsToText } from "@/lib/product-faq"
import { resolveBrandLogoUrl } from "@/lib/brand-logos"
import MediaLibraryModal from "./MediaLibraryModal"

function slugify(text: string) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-")
}

export default function BrandManager({ brands: initialBrands }: { brands: (BrandDTO | BrandDetailDTO)[] }) {
  const [brands, setBrands] = useState(initialBrands)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Fields
  const [name, setName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [bannerUrl, setBannerUrl] = useState("")
  const [sizeGuideImageUrl, setSizeGuideImageUrl] = useState("")
  const [sizeGuideMenUrl, setSizeGuideMenUrl] = useState("")
  const [sizeGuideWomenUrl, setSizeGuideWomenUrl] = useState("")
  const [sizeGuideKidsUrl, setSizeGuideKidsUrl] = useState("")
  const [sizeGuideNote, setSizeGuideNote] = useState("")
  const [description, setDescription] = useState("")
  const [story, setStory] = useState("")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [highlightsText, setHighlightsText] = useState("")
  const [faqsText, setFaqsText] = useState("")
  const [isActive, setIsActive] = useState(true)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingSizeGuide, setUploadingSizeGuide] = useState(false)
  const [uploadingSizeGuideMen, setUploadingSizeGuideMen] = useState(false)
  const [uploadingSizeGuideWomen, setUploadingSizeGuideWomen] = useState(false)
  const [uploadingSizeGuideKids, setUploadingSizeGuideKids] = useState(false)
  const [mediaTarget, setMediaTarget] = useState<"logo" | "banner" | "sizeGuide" | "sizeGuideMen" | "sizeGuideWomen" | "sizeGuideKids" | null>(null)

  const resetForm = () => {
    setName("")
    setLogoUrl("")
    setBannerUrl("")
    setSizeGuideImageUrl("")
    setSizeGuideMenUrl("")
    setSizeGuideWomenUrl("")
    setSizeGuideKidsUrl("")
    setSizeGuideNote("")
    setDescription("")
    setStory("")
    setMetaTitle("")
    setMetaDescription("")
    setHighlightsText("")
    setFaqsText("")
    setIsActive(true)
    setError("")
    setIsEditing(null)
    setIsAdding(false)
  }

  const startAdd = () => {
    resetForm()
    setIsAdding(true)
  }

  const startEdit = (brand: BrandDTO | BrandDetailDTO) => {
    const detail = brand as BrandDetailDTO
    setIsEditing(brand.id)
    setName(brand.name)
    setLogoUrl(brand.logoUrl ?? "")
    setBannerUrl(detail.bannerUrl ?? "")
    setSizeGuideImageUrl(detail.sizeGuideImageUrl ?? "")
    setSizeGuideMenUrl(detail.sizeGuideMenUrl ?? "")
    setSizeGuideWomenUrl(detail.sizeGuideWomenUrl ?? "")
    setSizeGuideKidsUrl(detail.sizeGuideKidsUrl ?? "")
    setSizeGuideNote(detail.sizeGuideNote ?? "")
    setDescription(detail.description ?? "")
    setStory(detail.story ?? "")
    setMetaTitle(detail.metaTitle ?? "")
    setMetaDescription(detail.metaDescription ?? "")
    setHighlightsText((detail.highlights ?? []).join("\n"))
    setFaqsText(detail.faqs ? faqsToText(detail.faqs) : "")
    setIsActive(brand.isActive)
    setIsAdding(false)
    setError("")
  }

  async function handleFileUpload(file: File, target: "logo" | "banner" | "sizeGuide" | "sizeGuideMen" | "sizeGuideWomen" | "sizeGuideKids") {
    if (target === "logo") setUploadingLogo(true)
    else if (target === "banner") setUploadingBanner(true)
    else if (target === "sizeGuide") setUploadingSizeGuide(true)
    else if (target === "sizeGuideMen") setUploadingSizeGuideMen(true)
    else if (target === "sizeGuideWomen") setUploadingSizeGuideWomen(true)
    else if (target === "sizeGuideKids") setUploadingSizeGuideKids(true)

    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (res.ok) {
        if (target === "logo") setLogoUrl(data.url)
        else if (target === "banner") setBannerUrl(data.url)
        else if (target === "sizeGuide") setSizeGuideImageUrl(data.url)
        else if (target === "sizeGuideMen") setSizeGuideMenUrl(data.url)
        else if (target === "sizeGuideWomen") setSizeGuideWomenUrl(data.url)
        else if (target === "sizeGuideKids") setSizeGuideKidsUrl(data.url)
      } else {
        setError(data.error ?? "Error al subir archivo")
      }
    } catch {
      setError("Error de red al subir archivo")
    } finally {
      if (target === "logo") setUploadingLogo(false)
      else if (target === "banner") setUploadingBanner(false)
      else if (target === "sizeGuide") setUploadingSizeGuide(false)
      else if (target === "sizeGuideMen") setUploadingSizeGuideMen(false)
      else if (target === "sizeGuideWomen") setUploadingSizeGuideWomen(false)
      else if (target === "sizeGuideKids") setUploadingSizeGuideKids(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("El nombre es requerido.")
      return
    }
    setError("")
    const fd = new FormData()
    fd.set("name", name.trim())
    fd.set("logoUrl", logoUrl.trim())
    fd.set("bannerUrl", bannerUrl.trim())
    fd.set("sizeGuideImageUrl", sizeGuideImageUrl.trim())
    fd.set("sizeGuideMenUrl", sizeGuideMenUrl.trim())
    fd.set("sizeGuideWomenUrl", sizeGuideWomenUrl.trim())
    fd.set("sizeGuideKidsUrl", sizeGuideKidsUrl.trim())
    fd.set("sizeGuideNote", sizeGuideNote.trim())
    fd.set("description", description.trim())
    fd.set("story", story.trim())
    fd.set("metaTitle", metaTitle.trim())
    fd.set("metaDescription", metaDescription.trim())
    fd.set("highlights", highlightsText)
    fd.set("faqs", faqsText)
    fd.set("isActive", String(isActive))

    startTransition(async () => {
      const result = isEditing
        ? await updateBrandAction(isEditing, fd)
        : await createBrandAction(fd)
      if (!result.success) {
        setError(result.error ?? "Error")
        return
      }

      const slug = slugify(name.trim())
      if (isEditing) {
        setBrands((prev) =>
          prev.map((b) =>
            b.id === isEditing
              ? {
                  ...b,
                  name: name.trim(),
                  slug,
                  logoUrl: logoUrl || null,
                  bannerUrl: bannerUrl || null,
                  sizeGuideImageUrl: sizeGuideImageUrl || null,
                  sizeGuideNote: sizeGuideNote || null,
                  description: description || null,
                  story: story || null,
                  metaTitle: metaTitle || null,
                  metaDescription: metaDescription || null,
                  isActive,
                }
              : b
          )
        )
      } else {
        setBrands((prev) => [
          ...prev,
          {
            id: result.id!,
            name: name.trim(),
            slug,
            erpId: null,
            logoUrl: logoUrl || null,
            bannerUrl: bannerUrl || null,
            sizeGuideImageUrl: sizeGuideImageUrl || null,
            sizeGuideNote: sizeGuideNote || null,
            description: description || null,
            story: story || null,
            metaTitle: metaTitle || null,
            metaDescription: metaDescription || null,
            highlights: [],
            faqs: [],
            isActive,
          },
        ])
      }
      resetForm()
    })
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta marca? Los productos que la tengan quedarán sin marca.")) return
    startTransition(async () => {
      const result = await deleteBrandAction(id)
      if (!result.success) {
        setError(result.error ?? "Error")
        return
      }
      setBrands((prev) => prev.filter((b) => b.id !== id))
    })
  }

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#E31C23]"

  return (
    <div className="space-y-6">
      {/* Add button */}
      {!isAdding && !isEditing && (
        <button
          onClick={startAdd}
          className="inline-flex items-center gap-2 bg-[#E31C23] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#c01018] transition-colors"
        >
          + Nueva Marca
        </button>
      )}

      {/* Form */}
      {(isAdding || isEditing) && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-bold text-[#1C1C1C] text-lg">
              {isEditing ? "Editar Marca" : "Nueva Marca"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-gray-500 hover:text-black font-semibold"
            >
              Cerrar ✕
            </button>
          </div>

          {/* Datos básicos */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Nombre *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Nike, Adidas, New Balance"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Descripción corta (Hero)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Calzado deportivo y urbano de alto rendimiento."
                className={inputCls}
              />
            </div>
          </div>

          {/* Logo y Banner */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Logo de Marca</label>
              {logoUrl ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-4">
                  <div className="w-16 h-12 bg-white border border-gray-200 rounded-lg p-1 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaTarget("logo")}
                      className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-xs font-bold text-[#1C1C1C] rounded-lg transition-colors"
                    >
                      Biblioteca
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaTarget("logo")}
                    className="px-3 py-2 bg-[#1C1C1C] text-white hover:bg-gray-800 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Elegir Logo
                  </button>
                  <label className="px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors">
                    <span>{uploadingLogo ? "Subiendo…" : "Subir archivo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, "logo")
                      }}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Banner */}
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Banner de Cabecera (opcional)</label>
              {bannerUrl ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-4">
                  <div className="w-24 h-12 bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaTarget("banner")}
                      className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-xs font-bold text-[#1C1C1C] rounded-lg transition-colors"
                    >
                      Biblioteca
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerUrl("")}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaTarget("banner")}
                    className="px-3 py-2 bg-[#1C1C1C] text-white hover:bg-gray-800 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Elegir Banner
                  </button>
                  <label className="px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors">
                    <span>{uploadingBanner ? "Subiendo…" : "Subir archivo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, "banner")
                      }}
                      disabled={uploadingBanner}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Guía de Tallas */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#1C1C1C]">
                Guías de Tallas Oficiales por Género
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Sube la tabla oficial de la marca para cada género. En la tienda los clientes podrán cambiar entre las pestañas &ldquo;Hombre&rdquo;, &ldquo;Mujer&rdquo; y &ldquo;Niños&rdquo;. Si no se sube imagen, se mostrará la tabla de conversión estándar (EU / US / CM / UK).
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Guía Hombre */}
              <div className="p-3 bg-white border border-gray-200 rounded-lg">
                <span className="block text-xs font-bold text-gray-700 uppercase mb-2">Guía Hombre</span>
                {sizeGuideMenUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 bg-gray-50 border border-gray-200 rounded p-1 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sizeGuideMenUrl} alt="Guía Hombre" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMediaTarget("sizeGuideMen")}
                        className="px-2 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-[11px] font-bold rounded"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setSizeGuideMenUrl("")}
                        className="px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaTarget("sizeGuideMen")}
                      className="px-2.5 py-1.5 bg-[#1C1C1C] text-white hover:bg-gray-800 rounded text-xs font-bold uppercase"
                    >
                      Elegir
                    </button>
                    <label className="px-2.5 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs font-bold uppercase cursor-pointer">
                      <span>{uploadingSizeGuideMen ? "Subiendo…" : "Subir"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file, "sizeGuideMen")
                        }}
                        disabled={uploadingSizeGuideMen}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Guía Mujer */}
              <div className="p-3 bg-white border border-gray-200 rounded-lg">
                <span className="block text-xs font-bold text-gray-700 uppercase mb-2">Guía Mujer</span>
                {sizeGuideWomenUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 bg-gray-50 border border-gray-200 rounded p-1 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sizeGuideWomenUrl} alt="Guía Mujer" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMediaTarget("sizeGuideWomen")}
                        className="px-2 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-[11px] font-bold rounded"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setSizeGuideWomenUrl("")}
                        className="px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaTarget("sizeGuideWomen")}
                      className="px-2.5 py-1.5 bg-[#1C1C1C] text-white hover:bg-gray-800 rounded text-xs font-bold uppercase"
                    >
                      Elegir
                    </button>
                    <label className="px-2.5 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs font-bold uppercase cursor-pointer">
                      <span>{uploadingSizeGuideWomen ? "Subiendo…" : "Subir"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file, "sizeGuideWomen")
                        }}
                        disabled={uploadingSizeGuideWomen}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Guía Niños / Junior */}
              <div className="p-3 bg-white border border-gray-200 rounded-lg">
                <span className="block text-xs font-bold text-gray-700 uppercase mb-2">Guía Niños / Junior</span>
                {sizeGuideKidsUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 bg-gray-50 border border-gray-200 rounded p-1 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sizeGuideKidsUrl} alt="Guía Niños" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMediaTarget("sizeGuideKids")}
                        className="px-2 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-[11px] font-bold rounded"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setSizeGuideKidsUrl("")}
                        className="px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaTarget("sizeGuideKids")}
                      className="px-2.5 py-1.5 bg-[#1C1C1C] text-white hover:bg-gray-800 rounded text-xs font-bold uppercase"
                    >
                      Elegir
                    </button>
                    <label className="px-2.5 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs font-bold uppercase cursor-pointer">
                      <span>{uploadingSizeGuideKids ? "Subiendo…" : "Subir"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file, "sizeGuideKids")
                        }}
                        disabled={uploadingSizeGuideKids}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Guía General (Fallback) */}
              <div className="p-3 bg-white border border-gray-200 rounded-lg">
                <span className="block text-xs font-bold text-gray-700 uppercase mb-2">Guía General / Unisex</span>
                {sizeGuideImageUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 bg-gray-50 border border-gray-200 rounded p-1 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sizeGuideImageUrl} alt="Guía General" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMediaTarget("sizeGuide")}
                        className="px-2 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-[11px] font-bold rounded"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setSizeGuideImageUrl("")}
                        className="px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaTarget("sizeGuide")}
                      className="px-2.5 py-1.5 bg-[#1C1C1C] text-white hover:bg-gray-800 rounded text-xs font-bold uppercase"
                    >
                      Elegir
                    </button>
                    <label className="px-2.5 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs font-bold uppercase cursor-pointer">
                      <span>{uploadingSizeGuide ? "Subiendo…" : "Subir"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file, "sizeGuide")
                        }}
                        disabled={uploadingSizeGuide}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Nota de la guía */}
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">
                Nota de la Guía de Tallas (opcional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Recomendación de horma o calce para esta marca (ej. &ldquo;Los modelos Hoka tienen horma ancha. Se recomienda pedir media talla menos.&rdquo;).
              </p>
              <textarea
                rows={3}
                value={sizeGuideNote}
                onChange={(e) => setSizeGuideNote(e.target.value)}
                placeholder="Ej. La horma de esta marca es reducida. Te aconsejamos seleccionar una talla superior a tu habitual."
                className={inputCls}
                maxLength={500}
              />
            </div>
          </div>

          {/* Historia y Filosofía */}
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">
              Historia y Filosofía de la Marca (texto plano)
            </label>
            <textarea
              rows={4}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Explica la historia de la marca, su tecnología y su propuesta de valor. Se mostrará en párrafos limpios en la página de marca."
              className={inputCls}
            />
          </div>

          {/* Beneficios propios y FAQs */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">
                Beneficios propios de la marca (uno por línea)
              </label>
              <textarea
                rows={4}
                value={highlightsText}
                onChange={(e) => setHighlightsText(e.target.value)}
                placeholder={"Amortiguación Air: Máxima absorción de impactos\nDiseño icónico: Estilo atemporal para todo el día"}
                className={inputCls}
              />
              <p className="text-xs text-gray-500 mt-1">Formato: &ldquo;Título: detalle&rdquo; o texto simple.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1C1C] mb-1">
                Preguntas frecuentes de la marca (Pregunta | Respuesta)
              </label>
              <textarea
                rows={4}
                value={faqsText}
                onChange={(e) => setFaqsText(e.target.value)}
                placeholder={"¿Nike talla normal? | La mayoría de modelos corren fieles a la talla.\n¿Cómo cuidar las zapatillas? | Limpiar con paño suave y jabón neutro."}
                className={inputCls}
              />
              <p className="text-xs text-gray-500 mt-1">Una por línea separada con &ldquo;|&rdquo;.</p>
            </div>
          </div>

          {/* SEO propio */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-sm text-[#1C1C1C]">SEO y Meta Etiquetas de Marca</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Meta Title (opcional)</label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Nike Colombia | Calzado y Ropa Original - One Star"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Meta Description (opcional)</label>
                <input
                  type="text"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Compra calzado Nike original con envío a todo Colombia y garantía de cambio."
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm text-[#1C1C1C]">
              Activa (visible en el catálogo y página de marcas)
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="bg-[#E31C23] text-white text-sm font-bold px-5 py-2 rounded-lg hover:bg-[#c01018] transition-colors disabled:opacity-50"
            >
              {isPending ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear marca"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-[#4A4A4A] hover:text-[#1C1C1C] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Brand list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {brands.length === 0 ? (
          <div className="p-8 text-center text-[#4A4A4A] text-sm">
            No hay marcas aún. Agrega la primera marca.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">Logo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">ID ERP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {brands.map((brand) => {
                const resolvedLogo = resolveBrandLogoUrl(brand)
                return (
                <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    {resolvedLogo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={resolvedLogo} alt={brand.name} className="h-8 w-16 object-contain" />
                    ) : (
                      <div className="h-8 w-16 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-400">Sin logo</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#4A4A4A] font-mono text-xs truncate max-w-[150px]">
                    {brand.erpId || "-"}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1C1C1C]">{brand.name}</td>
                  <td className="px-4 py-3 text-[#4A4A4A] font-mono text-xs">{brand.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                        brand.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {brand.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => startEdit(brand)}
                      className="text-xs text-[#1C1C1C] hover:text-[#E31C23] font-medium transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(brand.id)}
                      disabled={isPending}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Media Library Modal */}
      <MediaLibraryModal
        isOpen={Boolean(mediaTarget)}
        onClose={() => setMediaTarget(null)}
        acceptedType="image"
        title={
          mediaTarget === "logo"
            ? "Seleccionar Logo de Marca"
            : mediaTarget === "banner"
            ? "Seleccionar Banner de Marca"
            : mediaTarget === "sizeGuideMen"
            ? "Seleccionar Guía de Tallas (Hombre)"
            : mediaTarget === "sizeGuideWomen"
            ? "Seleccionar Guía de Tallas (Mujer)"
            : mediaTarget === "sizeGuideKids"
            ? "Seleccionar Guía de Tallas (Niños / Junior)"
            : "Seleccionar Guía de Tallas (General)"
        }
        onSelect={(media) => {
          if (mediaTarget === "logo") setLogoUrl(media.url)
          else if (mediaTarget === "banner") setBannerUrl(media.url)
          else if (mediaTarget === "sizeGuide") setSizeGuideImageUrl(media.url)
          else if (mediaTarget === "sizeGuideMen") setSizeGuideMenUrl(media.url)
          else if (mediaTarget === "sizeGuideWomen") setSizeGuideWomenUrl(media.url)
          else if (mediaTarget === "sizeGuideKids") setSizeGuideKidsUrl(media.url)
          setMediaTarget(null)
        }}
      />
    </div>
  )
}
