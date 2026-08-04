"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition, useCallback, useMemo, useEffect } from "react"
import type { Category, StoreLocation } from "@prisma/client"
import type { ProductWithRelations } from "@/types/admin"
import { createProduct, updateProduct, deleteProduct, searchProducts } from "@/app/admin/productos/actions"
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import {
  PRODUCT_COLORS,
  buildColorSelectGroups,
  getColorSwatchStyle,
  isKnownColor,
  isRealColor,
  type ColorPalette,
} from "@/lib/colors"
import ProductImagesByColor from "./images/ProductImagesByColor"
import {
  MIN_PRODUCT_IMAGES,
  isColorPanelDropData,
  isImageDragData,
  type ImageRow,
} from "./images/types"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface VariantRow {
  id?: string
  sku: string
  size: string
  color: string
  stock: string
  inventory: Array<{ storeLocationId: string | null; stock: string }>
  sizeUS: string
  sizeCM: string
  sizeEUR: string
}

interface CrossSellItem {
  id: string
  name: string
  brandId: string | null
  brandName: string | null
}

interface Props {
  mode: "create" | "edit"
  product?: ProductWithRelations
  categories: { id: string; name: string }[]
  brands?: { id: string; name: string }[]
  stores?: StoreLocation[]
  /** Paleta activa (administrable en /admin/colores). Vacía = paleta de respaldo. */
  colorPalette?: ColorPalette
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

function generateSku(name: string, color: string, size: string): string {
  const n = name.slice(0, 4).toUpperCase().replace(/\s+/g, "")
  const c = color.slice(0, 3).toUpperCase().replace(/\s+/g, "")
  const s = size.toUpperCase().replace(/\s+/g, "")
  return `${n}-${c}-${s}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
}

// ─── Section Wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="font-['Barlow',sans-serif] text-base font-bold text-[#1C1C1C] mb-4 pb-3 border-b border-gray-100">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-[#1C1C1C] mb-1">
        {label}
        {required && <span className="text-[#E31C23] ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[#4A4A4A] mt-1">{hint}</p>}
    </div>
  )
}

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23] placeholder:text-gray-400"

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ProductForm({
  mode,
  product,
  categories,
  brands = [],
  stores = [],
  colorPalette,
}: Props) {
  const palette = colorPalette && Object.keys(colorPalette).length > 0 ? colorPalette : PRODUCT_COLORS
  const colorGroups = useMemo(() => buildColorSelectGroups(palette), [palette])
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Basic fields
  const [name, setName] = useState(product?.name ?? "")
  const [slug, setSlug] = useState(product?.slug ?? "")
  const [brandId, setBrandId] = useState(product?.brandId ?? "")
  const [gender, setGender] = useState(product?.gender ?? "")
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "")
  const [description, setDescription] = useState(product?.description ?? "")
  const [extendedDescription, setExtendedDescription] = useState(product?.extendedDescription ?? "")
  const [videoUrl, setVideoUrl] = useState(product?.videoUrl ?? "")
  const [availableOnline, setAvailableOnline] = useState(product?.availableOnline ?? true)
  const [availableInStores, setAvailableInStores] = useState(product?.availableInStores ?? true)

  // Pricing
  const [basePrice, setBasePrice] = useState(product?.basePrice ? String(Number(product.basePrice)) : "")
  const [isOnSale, setIsOnSale] = useState(product?.isOnSale ?? false)
  const [salePrice, setSalePrice] = useState(product?.salePrice ? String(Number(product.salePrice)) : "")

  // SEO
  const [metaTitle, setMetaTitle] = useState(product?.metaTitle ?? "")
  const [metaDescription, setMetaDescription] = useState(product?.metaDescription ?? "")

  // Variants
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map((v) => {
      // Map existing DB inventory to local string array
      const mappedInventory: Array<{ storeLocationId: string | null; stock: string }> = stores.map(store => {
        const found = v.inventory?.find((i: any) => i.storeLocationId === store.id)
        return {
          storeLocationId: store.id,
          stock: found ? String(found.stock) : "0"
        }
      })
      // Web warehouse (storeLocationId null)
      const webInventory = v.inventory?.find((i: any) => i.storeLocationId === null)
      mappedInventory.unshift({
        storeLocationId: null,
        stock: webInventory ? String(webInventory.stock) : String(v.stock || 0)
      })

      return {
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        stock: String(v.stock),
        inventory: mappedInventory,
        sizeUS: v.sizeUS ?? "",
        sizeCM: v.sizeCM ?? "",
        sizeEUR: v.sizeEUR ?? "",
      }
    }) ?? []
  )

  // Images
  const [images, setImages] = useState<ImageRow[]>(
    product?.images.map((img, idx) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      position: img.position ?? idx,
      color: img.color ?? null,
    })) ?? []
  )
  // Color del panel que está subiendo ahora mismo (null = el panel "General").
  // `undefined` significa que no hay ninguna subida en curso.
  const [uploadingColor, setUploadingColor] = useState<string | null | undefined>(undefined)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Cross-sells
  const [crossSells, setCrossSells] = useState<CrossSellItem[]>(
    product?.crossSells.map((p) => ({ id: p.id, name: p.name, brandId: p.brandId ?? null, brandName: p.brand?.name ?? null })) ?? []
  )
  const [crossSellSearch, setCrossSearch] = useState("")
  const [crossSellResults, setCrossResults] = useState<CrossSellItem[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, startDelete] = useTransition()

  // Drag state
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const handleDragEnterCard = useCallback((idx: number) => setDragOverIdx(idx), [])
  const handleDragLeaveCard = useCallback(() => setDragOverIdx(null), [])

  // Colores disponibles: los de las variantes sincronizadas desde Loggro
  const variantColors = useMemo(
    () => [...new Set(variants.map((v) => v.color.trim()).filter(Boolean))],
    [variants]
  )

  useEffect(() => {
    return monitorForElements({
      onDragStart: ({ source }) => {
        if (isImageDragData(source.data)) setDraggingIdx(source.data.index)
      },
      onDrop: ({ source, location }) => {
        setDraggingIdx(null)
        setDragOverIdx(null)
        if (!isImageDragData(source.data)) return

        // El primer destino es el más interno: una tarjeta si se soltó encima
        // de otra foto, o el panel del color si se soltó en su zona libre.
        const [target] = location.current.dropTargets
        if (!target) return
        const from = source.data.index

        // Sobre otra foto: se reordena y, si esa foto es de otro color, la
        // arrastrada adopta ese color (arrastrar entre secciones la traslada).
        if (isImageDragData(target.data)) {
          const to = target.data.index
          if (from === to) return
          setImages((prev) => {
            const targetColor = prev[to]?.color ?? null
            const next = [...prev]
            const [moved] = next.splice(from, 1)
            // Tras quitar el origen, todo lo que estaba detrás corre una posición.
            const insertAt = from < to ? to - 1 : to
            next.splice(insertAt, 0, { ...moved, color: targetColor })
            return next.map((img, i) => ({ ...img, position: i }))
          })
          return
        }

        // Sobre la zona libre de un panel: la foto pasa al final de ese color.
        if (isColorPanelDropData(target.data)) {
          const targetColor = target.data.color
          setImages((prev) => {
            if (prev[from]?.color === targetColor) return prev
            const next = [...prev]
            const [moved] = next.splice(from, 1)
            next.push({ ...moved, color: targetColor })
            return next.map((img, i) => ({ ...img, position: i }))
          })
        }
      },
    })
  }, [])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleNameChange(val: string) {
    setName(val)
    if (mode === "create") {
      setSlug(slugify(val))
    }
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        sku: generateSku(name, "", ""),
        size: "",
        color: "",
        stock: "0",
        inventory: [
          { storeLocationId: null, stock: "0" },
          ...stores.map(s => ({ storeLocationId: s.id, stock: "0" }))
        ],
        sizeUS: "",
        sizeCM: "",
        sizeEUR: "",
      },
    ])
  }

  function updateVariant(idx: number, field: keyof VariantRow, value: string) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)))
  }

  /**
   * Asigna un color a TODAS las variantes. Las tallas de un mismo producto
   * suelen compartir color, así que evita repetir la selección fila por fila.
   */
  function applyColorToAllVariants(color: string) {
    setVariants((prev) => prev.map((v) => ({ ...v, color })))
  }

  function updateVariantInventory(idx: number, storeId: string | null, stockValue: string) {
    setVariants((prev) => prev.map((v, i) => {
      if (i !== idx) return v
      return {
        ...v,
        inventory: v.inventory.map(inv => 
          inv.storeLocationId === storeId ? { ...inv, stock: stockValue } : inv
        )
      }
    }))
  }

  function removeVariant(idx: number) {
    setVariants((prev) => prev.filter((_, i) => i !== idx))
  }

  function hasDuplicateSkus(): boolean {
    const skus = variants.map((v) => v.sku.trim()).filter(Boolean)
    return new Set(skus).size !== skus.length
  }

  async function handleFileUpload(files: FileList | null, targetColor: string | null) {
    if (!files || files.length === 0) return
    setUploadingColor(targetColor)
    setUploadError(null)

    const results: ImageRow[] = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append("file", file)
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        const data = await res.json()
        if (!res.ok) {
          setUploadError(data.error ?? "Error al subir imagen")
          break
        }
        results.push({
          url: data.url,
          alt: file.name.replace(/\.[^.]+$/, ""),
          position: 0,
          color: targetColor,
        })
      } catch {
        setUploadError("Error de red al subir imagen")
        break
      }
    }

    if (results.length > 0) {
      setImages((prev) => {
        const next = [...prev, ...results]
        return next.map((img, i) => ({ ...img, position: i }))
      })
    }
    setUploadingColor(undefined)
  }

  function addImageFromUrl(url: string, alt: string, color: string | null) {
    if (!url.trim()) return
    setImages((prev) => [
      ...prev,
      { url: url.trim(), alt: alt.trim() || name, position: prev.length, color },
    ])
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx).map((img, i) => ({ ...img, position: i })))
  }

  function setImageColor(idx: number, color: string | null) {
    setImages((prev) => prev.map((img, i) => (i === idx ? { ...img, color } : img)))
  }

  /**
   * Mueve una foto dentro de su propia sección de color. Se busca el vecino del
   * mismo color en la dirección pedida: como las fotos de distintos colores están
   * intercaladas en la lista, un simple `idx ± 1` la sacaría de su sección.
   */
  function moveImageWithinGroup(idx: number, dir: -1 | 1) {
    const current = images[idx]
    if (!current) return

    let neighbor = -1
    for (let i = idx + dir; i >= 0 && i < images.length; i += dir) {
      if (images[i].color === current.color) {
        neighbor = i
        break
      }
    }
    if (neighbor < 0) return

    const next = [...images]
    ;[next[idx], next[neighbor]] = [next[neighbor], next[idx]]
    setImages(next.map((img, i) => ({ ...img, position: i })))
  }

  const handleCrossSearch = useCallback(async (q: string) => {
    setCrossSearch(q)
    if (q.length < 2) {
      setCrossResults([])
      return
    }
    setIsSearching(true)
    try {
      const results = await searchProducts(q, product?.id)
      setCrossResults(
        results
          .filter((r) => !crossSells.some((cs) => cs.id === r.id))
          .map((r) => ({ id: r.id, name: r.name, brandId: r.brandId ?? null, brandName: r.brand?.name ?? null }))
      )
    } finally {
      setIsSearching(false)
    }
  }, [crossSells, product?.id])

  function addCrossSell(item: CrossSellItem) {
    setCrossSells((prev) => [...prev, item])
    setCrossResults((prev) => prev.filter((r) => r.id !== item.id))
    setCrossSearch("")
  }

  function removeCrossSell(id: string) {
    setCrossSells((prev) => prev.filter((cs) => cs.id !== id))
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  function handleSubmit() {
    setError(null)
    setSuccess(false)

    if (!name.trim()) { setError("El nombre es requerido."); return }
    if (!categoryId) { setError("Selecciona una categoría."); return }
    if (!basePrice || isNaN(parseFloat(basePrice))) { setError("El precio base es requerido."); return }
    if (isOnSale && (!salePrice || isNaN(parseFloat(salePrice)))) { setError("Ingresa el precio de oferta."); return }
    if (hasDuplicateSkus()) { setError("Hay SKUs duplicados en las variantes."); return }
    if (images.length < MIN_PRODUCT_IMAGES) {
      setError(`Sube al menos ${MIN_PRODUCT_IMAGES} imágenes del producto.`)
      return
    }
    // Las fotos se publican por color: una sin asignar no se vería en la ficha.
    const unassignedImages = images.filter((img) => !img.color).length
    if (unassignedImages > 0) {
      setError(
        `Hay ${unassignedImages} foto(s) sin color asignado. Arrástralas a la sección del color que corresponda antes de guardar.`
      )
      return
    }

    const formData = new FormData()
    formData.set("name", name)
    formData.set("slug", slug)
    formData.set("brandId", brandId)
    formData.set("gender", gender)
    formData.set("categoryId", categoryId)
    formData.set("description", description)
    formData.set("extendedDescription", extendedDescription)
    formData.set("videoUrl", videoUrl)
    formData.set("basePrice", basePrice)
    formData.set("isOnSale", String(isOnSale))
    formData.set("salePrice", salePrice)
    formData.set("metaTitle", metaTitle)
    formData.set("metaDescription", metaDescription)
    formData.set("availableOnline", String(availableOnline))
    formData.set("availableInStores", String(availableInStores))
    
    // Ensure all variants map their 'inventory' objects correctly with numbers
    const cleanVariants = variants.map(v => ({
      ...v,
      stock: Number(v.stock) || 0,
      inventory: v.inventory.map(inv => ({
        storeLocationId: inv.storeLocationId,
        stock: Number(inv.stock) || 0
      }))
    }))
    
    formData.set("variants", JSON.stringify(cleanVariants))
    formData.set("images", JSON.stringify(images))
    formData.set("crossSellIds", JSON.stringify(crossSells.map((cs) => cs.id)))

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProduct(formData)
          : await updateProduct(product!.id, formData)

      if (result.success) {
        setSuccess(true)
        if (mode === "create") {
          router.push(`/admin/productos/${result.id}`)
        }
      } else {
        setError(result.error ?? "Error desconocido.")
      }
    })
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteProduct(product!.id)
      if (result.success) {
        router.push("/admin/productos")
      } else {
        setError(result.error ?? "No se pudo eliminar.")
        setShowDeleteDialog(false)
      }
    })
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-[#E31C23] text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      {success && mode === "edit" && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          Producto guardado correctamente.
        </div>
      )}

      {/* A. Información básica */}
      <Section title="Información básica">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <Field label="Nombre del producto" required>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej. Air Max 90"
              className={inputClass}
            />
          </Field>
          <Field label="Slug" hint="URL amigable, auto-generado desde el nombre">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="air-max-90"
              className={inputClass}
            />
          </Field>
          <Field label="Marca">
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className={inputClass}
            >
              <option value="">Sin marca</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Género">
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
              <option value="">Sin especificar</option>
              <option value="UNISEX">Unisex</option>
              <option value="HOMBRE">Hombre</option>
              <option value="MUJER">Mujer</option>
              <option value="NINO">Niño</option>
              <option value="NINA">Niña</option>
              <option value="INFANTIL">Infantil</option>
              <option value="BEBE">Bebé</option>
            </select>
          </Field>
          <Field label="Categoría" required>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">Seleccionar categoría…</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="URL de video" hint="Opcional — YouTube, Vimeo…">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Descripción breve">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Descripción corta del producto…"
            className={inputClass}
          />
        </Field>
        <Field label="Descripción extendida">
          <textarea
            value={extendedDescription}
            onChange={(e) => setExtendedDescription(e.target.value)}
            rows={5}
            placeholder="Descripción completa, características, materiales…"
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => setAvailableOnline((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${availableOnline ? "bg-[#E31C23]" : "bg-gray-200"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${availableOnline ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
            <span className="text-sm font-medium text-[#1C1C1C]">Disponible Online (Web)</span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => setAvailableInStores((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${availableInStores ? "bg-[#E31C23]" : "bg-gray-200"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${availableInStores ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
            <span className="text-sm font-medium text-[#1C1C1C]">Disponible en Tiendas Físicas</span>
          </div>
        </div>
      </Section>

      {/* B. Precios */}
      <Section title="Precios">
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3 rounded-lg flex items-start gap-2">
          <span className="mt-0.5">ℹ️</span>
          <p>
            <strong>Solo lectura:</strong> Los precios (base y oferta) se gestionan exclusivamente desde tu sistema ERP (Loggro) para mantener consistencia contable.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <Field label="Precio base" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={basePrice}
                disabled
                className={`${inputClass} pl-7 bg-gray-50 text-gray-500 cursor-not-allowed`}
              />
            </div>
          </Field>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            disabled
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-not-allowed opacity-70 ${isOnSale ? "bg-[#E31C23]" : "bg-gray-200"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${isOnSale ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
          <span className="text-sm font-medium text-gray-500 cursor-not-allowed">¿Está en SALE?</span>
        </div>
        {isOnSale && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Field label="Precio de oferta" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={salePrice}
                  disabled
                  className={`${inputClass} pl-7 bg-gray-50 text-gray-500 cursor-not-allowed`}
                />
              </div>
            </Field>
          </div>
        )}
      </Section>

      {/* C. SEO */}
      <Section title="SEO">
        <Field label={`Meta título (${metaTitle.length}/60)`}>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value.slice(0, 60))}
            placeholder={name || "Título para buscadores…"}
            className={inputClass}
          />
        </Field>
        <Field label={`Meta descripción (${metaDescription.length}/160)`}>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value.slice(0, 160))}
            rows={3}
            placeholder="Descripción para buscadores…"
            className={inputClass}
          />
        </Field>
        {/* Google preview */}
        <div className="mt-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
          <p className="text-xs text-[#4A4A4A] mb-2 font-semibold uppercase tracking-wide">Vista previa en Google</p>
          <div className="max-w-lg">
            <p className="text-[#1a0dab] text-base font-medium truncate">
              {metaTitle || name || "Título del producto"}
            </p>
            <p className="text-[#006621] text-xs mb-0.5">
              onestar.co/productos/{slug || "slug-del-producto"}
            </p>
            <p className="text-[#545454] text-sm leading-snug line-clamp-2">
              {metaDescription || description || "Descripción del producto que aparecerá en los resultados de búsqueda de Google."}
            </p>
          </div>
        </div>
      </Section>

      {/* D. Variantes */}
      <Section title="Variantes (Color × Talla)">
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3 rounded-lg flex items-start gap-2">
          <span className="mt-0.5">ℹ️</span>
          <p>
            <strong>Inventario:</strong> El Stock Web, SKU y talla vienen de Loggro (solo lectura). Aquí puedes
            asignar el <strong>Color</strong> de cada variante —usado por el filtro de la tienda y las fotos por
            color— y el <strong>Stock en Tiendas Físicas</strong>.
          </p>
        </div>

        {variants.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <label htmlFor="bulk-color" className="text-xs font-medium text-[#1C1C1C]">
              Asignar color a todas las variantes:
            </label>
            <select
              id="bulk-color"
              value=""
              onChange={(e) => {
                if (e.target.value) applyColorToAllVariants(e.target.value)
              }}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
            >
              <option value="">Seleccionar color…</option>
              {colorGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="text-xs text-[#4A4A4A]">
              Útil cuando todas las tallas son del mismo color.
            </span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs mb-3">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-2 text-[#4A4A4A] font-semibold min-w-[120px]">SKU</th>
                <th className="text-left py-2 pr-2 text-[#4A4A4A] font-semibold min-w-[90px]">Color</th>
                <th className="text-left py-2 pr-2 text-[#4A4A4A] font-semibold min-w-[70px]">Talla</th>
                <th className="text-left py-2 pr-2 text-[#4A4A4A] font-semibold min-w-[60px]">Stock Web</th>
                {stores.map(store => (
                  <th key={store.id} className="text-left py-2 pr-2 text-[#4A4A4A] font-semibold min-w-[70px] truncate max-w-[100px]" title={store.name}>
                    {store.name}
                  </th>
                ))}
                <th className="text-left py-2 pr-2 text-[#4A4A4A] font-semibold min-w-[60px]">US</th>
                <th className="text-left py-2 pr-2 text-[#4A4A4A] font-semibold min-w-[60px]">CM</th>
                <th className="text-left py-2 pr-2 text-[#4A4A4A] font-semibold min-w-[60px]">EUR</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {variants.map((v, idx) => {
                const isDup = variants.some((other, oi) => oi !== idx && other.sku.trim() === v.sku.trim() && v.sku.trim() !== "")
                const webInv = v.inventory.find(i => i.storeLocationId === null)
                return (
                  <tr key={idx}>
                    <td className="py-1 pr-2">
                      <input
                        type="text"
                        value={v.sku}
                        disabled
                        className={`${inputClass} text-xs bg-gray-50 text-gray-500 cursor-not-allowed`}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-4 w-4 shrink-0 rounded-full ring-1 ${
                            isRealColor(v.color)
                              ? "ring-gray-300"
                              : "ring-gray-200 border border-dashed border-gray-300"
                          }`}
                          style={isRealColor(v.color) ? getColorSwatchStyle(v.color, palette) : undefined}
                          aria-hidden
                        />
                        <select
                          value={isRealColor(v.color) ? v.color : ""}
                          onChange={(e) => updateVariant(idx, "color", e.target.value)}
                          className={`${inputClass} text-xs`}
                          aria-label={`Color de la variante ${v.sku || idx + 1}`}
                        >
                          <option value="">Sin asignar</option>
                          {colorGroups.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                              {group.options.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </optgroup>
                          ))}
                          {/* Conserva un color histórico que no esté en la paleta */}
                          {isRealColor(v.color) && !isKnownColor(v.color, palette) && (
                            <option value={v.color}>{v.color}</option>
                          )}
                        </select>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <input type="text" value={v.size} disabled className={`${inputClass} text-xs bg-gray-50 text-gray-500 cursor-not-allowed`} />
                    </td>
                    <td className="py-1 pr-2">
                      <input 
                        type="number" 
                        value={webInv?.stock || "0"} 
                        disabled
                        className={`${inputClass} text-xs border-blue-200 bg-blue-50/50 text-gray-500 cursor-not-allowed`} 
                        title="Stock Bodega Web"
                      />
                    </td>
                    {stores.map(store => {
                      const storeInv = v.inventory.find(i => i.storeLocationId === store.id)
                      return (
                        <td key={store.id} className="py-1 pr-2">
                          <input 
                            type="number" 
                            value={storeInv?.stock || "0"} 
                            onChange={(e) => updateVariantInventory(idx, store.id, e.target.value)} 
                            min="0" 
                            className={`${inputClass} text-xs`} 
                            title={`Stock ${store.name}`}
                          />
                        </td>
                      )
                    })}
                    <td className="py-1 pr-2">
                      <input type="text" value={v.sizeUS} disabled className={`${inputClass} text-xs bg-gray-50 text-gray-500 cursor-not-allowed`} />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="text" value={v.sizeCM} disabled className={`${inputClass} text-xs bg-gray-50 text-gray-500 cursor-not-allowed`} />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="text" value={v.sizeEUR} disabled className={`${inputClass} text-xs bg-gray-50 text-gray-500 cursor-not-allowed`} />
                    </td>
                    <td className="py-1">
                      {/* Eliminar Variante Button Removed */}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* E. Imágenes */}
      <Section title="Imágenes por color">
        <ProductImagesByColor
          images={images}
          variantColors={variantColors}
          uploadingColor={uploadingColor ?? null}
          isUploading={uploadingColor !== undefined}
          uploadError={uploadError}
          onUpload={(files, color) => void handleFileUpload(files, color)}
          onAddUrl={addImageFromUrl}
          onRemove={removeImage}
          onColorChange={setImageColor}
          onMoveWithinGroup={moveImageWithinGroup}
          draggingIdx={draggingIdx}
          dragOverIdx={dragOverIdx}
          onDragEnter={handleDragEnterCard}
          onDragLeave={handleDragLeaveCard}
        />
      </Section>

      {/* F. Cross-selling */}
      <Section title="Cross-selling (productos relacionados)">
        <div className="relative mb-3">
          <input
            type="text"
            value={crossSellSearch}
            onChange={(e) => handleCrossSearch(e.target.value)}
            placeholder="Buscar producto para agregar…"
            className={inputClass}
          />
          {isSearching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4A4A4A]">Buscando…</span>
          )}
          {crossSellResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
              {crossSellResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addCrossSell(item)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-[#1C1C1C] border-b border-gray-50 last:border-0"
                >
                  <span className="font-medium">{item.name}</span>
                  {item.brandName && <span className="text-[#4A4A4A] ml-1">· {item.brandName}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        {crossSells.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {crossSells.map((cs) => (
              <div
                key={cs.id}
                className="flex items-center gap-1 bg-gray-100 text-[#1C1C1C] text-sm px-3 py-1 rounded-full"
              >
                <span>{cs.name}</span>
                {cs.brandName && <span className="text-[#4A4A4A] text-xs">· {cs.brandName}</span>}
                <button
                  type="button"
                  onClick={() => removeCrossSell(cs.id)}
                  className="ml-1 text-[#4A4A4A] hover:text-[#E31C23] transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Sin productos relacionados.</p>
        )}
      </Section>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 py-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-[#E31C23] text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? "Guardando…" : mode === "create" ? "Crear producto" : "Guardar cambios"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/productos")}
            className="border border-gray-200 text-[#1C1C1C] font-medium px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
        {mode === "edit" && (
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="text-sm text-gray-400 hover:text-[#E31C23] transition-colors"
          >
            Eliminar producto
          </button>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-2">
              ¿Eliminar producto?
            </h3>
            <p className="text-sm text-[#4A4A4A] mb-6">
              Esta acción es irreversible. Se eliminarán también todas las variantes e imágenes asociadas.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                className="border border-gray-200 text-[#1C1C1C] font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-[#E31C23] text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {isDeleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
