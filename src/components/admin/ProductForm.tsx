"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition, useCallback, useMemo, useRef, useEffect } from "react"
import type { Category, StoreLocation } from "@prisma/client"
import type { ProductWithRelations } from "@/types/admin"
import { createProduct, updateProduct, deleteProduct, searchProducts } from "@/app/admin/productos/actions"
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import {
  PRODUCT_COLORS,
  buildColorSelectGroups,
  getColorSwatchStyle,
  isKnownColor,
  isRealColor,
  type ColorPalette,
} from "@/lib/colors"

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

interface ImageRow {
  id?: string
  url: string
  alt: string
  position: number
  /** Color de variante al que pertenece la foto. null = imagen general del producto. */
  color: string | null
}

/** Valor del selector que representa "imagen general, sin color asignado". */
const NO_COLOR = "__general__"

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

// ─── Image Drag & Drop ─────────────────────────────────────────────────────────

interface ImageDragData {
  type: "image-card"
  index: number
  [key: string]: unknown
}

function isImageDragData(data: Record<string, unknown>): data is ImageDragData {
  return data.type === "image-card" && typeof data.index === "number"
}

interface DraggableImageCardProps {
  image: ImageRow
  index: number
  total: number
  isDragSource: boolean
  isDragTarget: boolean
  availableColors: string[]
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onColorChange: (color: string | null) => void
  onDragEnter: (index: number) => void
  onDragLeave: () => void
}

function DraggableImageCard({
  image, index, total, isDragSource, isDragTarget, availableColors,
  onRemove, onMove, onColorChange, onDragEnter, onDragLeave,
}: DraggableImageCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    const handle = handleRef.current
    if (!card || !handle) return

    return combine(
      draggable({
        element: card,
        dragHandle: handle,
        getInitialData: (): Record<string, unknown> => ({ type: "image-card", index }),
      }),
      dropTargetForElements({
        element: card,
        canDrop: ({ source }) =>
          isImageDragData(source.data) && source.data.index !== index,
        getData: (): Record<string, unknown> => ({ type: "image-card", index }),
        onDragEnter: () => onDragEnter(index),
        onDragLeave: () => onDragLeave(),
      }),
    )
  }, [index, onDragEnter, onDragLeave])

  return (
    <div
      ref={cardRef}
      className={`relative group select-none transition-opacity duration-150 ${isDragSource ? "opacity-30" : ""}`}
    >
      {/* Drop indicator line */}
      {isDragTarget && (
        <span className="pointer-events-none absolute -left-1.5 top-0 bottom-0 w-0.5 rounded-full bg-[#E31C23] z-20" />
      )}

      {/* Drag handle */}
      <div
        ref={handleRef}
        title="Arrastrar para reordenar"
        className="absolute top-1 left-1 z-10 p-0.5 bg-black/50 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
          <circle cx="5"  cy="4"  r="1.2" />
          <circle cx="5"  cy="8"  r="1.2" />
          <circle cx="5"  cy="12" r="1.2" />
          <circle cx="11" cy="4"  r="1.2" />
          <circle cx="11" cy="8"  r="1.2" />
          <circle cx="11" cy="12" r="1.2" />
        </svg>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt}
        draggable={false}
        className={`w-20 h-20 object-cover rounded-lg border transition-all ${
          isDragTarget ? "border-[#E31C23] shadow-md" : "border-gray-200"
        }`}
        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.svg" }}
      />

      {index === 0 && (
        <span className="absolute top-1 right-1 bg-[#E31C23] text-white text-[10px] px-1 rounded leading-tight">
          Principal
        </span>
      )}

      <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="text-white text-sm disabled:opacity-30"
          title="Mover izquierda"
        >←</button>
        <button
          type="button"
          onClick={onRemove}
          className="text-white text-sm bg-[#E31C23] rounded-full w-5 h-5 flex items-center justify-center"
          title="Eliminar"
        >×</button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="text-white text-sm disabled:opacity-30"
          title="Mover derecha"
        >→</button>
      </div>

      {/* Color de la foto — define con qué variante se muestra en la ficha */}
      <select
        value={image.color ?? NO_COLOR}
        onChange={(e) => onColorChange(e.target.value === NO_COLOR ? null : e.target.value)}
        className="mt-1 w-20 text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white text-[#1C1C1C] focus:outline-none focus:ring-1 focus:ring-[#E31C23]"
        title="Color al que pertenece esta foto"
        aria-label={`Color de la imagen ${index + 1}`}
      >
        <option value={NO_COLOR}>General</option>
        {availableColors.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <p className="text-[10px] text-[#4A4A4A] mt-0.5 text-center truncate max-w-[80px]">
        {image.alt || "sin alt"}
      </p>
    </div>
  )
}

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
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [imageAltInput, setImageAltInput] = useState("")
  // Color asignado a las fotos que se suban a continuación
  const [uploadColor, setUploadColor] = useState<string>(NO_COLOR)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)
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

  // Cuántas fotos tiene cada color — permite avisar de colores sin foto
  const imageCountByColor = useMemo(() => {
    const counts = new Map<string, number>()
    for (const img of images) {
      if (!img.color) continue
      counts.set(img.color, (counts.get(img.color) ?? 0) + 1)
    }
    return counts
  }, [images])

  const generalImageCount = images.filter((img) => !img.color).length
  const colorsWithoutImages = variantColors.filter((c) => !imageCountByColor.has(c))

  useEffect(() => {
    return monitorForElements({
      onDragStart: ({ source }) => {
        if (isImageDragData(source.data)) setDraggingIdx(source.data.index)
      },
      onDrop: ({ source, location }) => {
        setDraggingIdx(null)
        setDragOverIdx(null)
        if (!isImageDragData(source.data)) return
        const [target] = location.current.dropTargets
        if (!target || !isImageDragData(target.data)) return
        const from = source.data.index
        const to = target.data.index
        if (from === to) return
        setImages((prev) => {
          const next = [...prev]
          const [moved] = next.splice(from, 1)
          next.splice(to, 0, moved)
          return next.map((img, i) => ({ ...img, position: i }))
        })
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

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadingFiles(true)
    setUploadError(null)

    const targetColor = uploadColor === NO_COLOR ? null : uploadColor
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
    setUploadingFiles(false)
  }

  function addImageFromUrl() {
    if (!imageUrlInput.trim()) return
    setImages((prev) => [
      ...prev,
      {
        url: imageUrlInput.trim(),
        alt: imageAltInput.trim() || name,
        position: prev.length,
        color: uploadColor === NO_COLOR ? null : uploadColor,
      },
    ])
    setImageUrlInput("")
    setImageAltInput("")
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx).map((img, i) => ({ ...img, position: i })))
  }

  function setImageColor(idx: number, color: string | null) {
    setImages((prev) => prev.map((img, i) => (i === idx ? { ...img, color } : img)))
  }

  /** Reordena la lista agrupando las fotos por color, respetando el orden de las variantes. */
  function groupImagesByColor() {
    setImages((prev) => {
      const order = new Map(variantColors.map((c, i) => [c, i]))
      const rank = (img: ImageRow) =>
        img.color === null ? Number.MAX_SAFE_INTEGER : order.get(img.color) ?? Number.MAX_SAFE_INTEGER - 1
      return [...prev]
        .sort((a, b) => rank(a) - rank(b))
        .map((img, i) => ({ ...img, position: i }))
    })
  }

  function moveImage(idx: number, dir: -1 | 1) {
    const newImages = [...images]
    const target = idx + dir
    if (target < 0 || target >= newImages.length) return
    ;[newImages[idx], newImages[target]] = [newImages[target], newImages[idx]]
    setImages(newImages.map((img, i) => ({ ...img, position: i })))
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
    if (images.length < 5) { setError("Sube al menos 5 imágenes del producto."); return }

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
        <p className="text-xs text-[#4A4A4A] mb-4">
          Mínimo 5 fotos requeridas · {images.length} cargada(s)
          {images.length < 5 && (
            <span className="text-[#E31C23] ml-1">— faltan {5 - images.length}</span>
          )}
        </p>

        {/* Selector del color al que se asignarán las fotos que se suban */}
        {variantColors.length > 0 ? (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <label htmlFor="upload-color" className="text-sm font-medium text-[#1C1C1C]">
                Subir fotos para el color:
              </label>
              <select
                id="upload-color"
                value={uploadColor}
                onChange={(e) => setUploadColor(e.target.value)}
                className={`${inputClass} w-auto min-w-[160px]`}
              >
                <option value={NO_COLOR}>General (todos los colores)</option>
                {variantColors.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={groupImagesByColor}
                  className="text-xs font-semibold text-[#1C1C1C] border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-white transition-colors"
                >
                  Agrupar por color
                </button>
              )}
            </div>
            <p className="text-xs text-[#4A4A4A] mt-2">
              En la ficha del producto, al elegir un color el cliente verá solo las fotos de ese
              color más las marcadas como <strong>General</strong>. Puedes cambiar el color de cada
              foto en su tarjeta.
            </p>

            {/* Resumen por color */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-[11px] bg-white border border-gray-200 text-[#4A4A4A] rounded-full px-2.5 py-0.5">
                General: {generalImageCount}
              </span>
              {variantColors.map((c) => {
                const count = imageCountByColor.get(c) ?? 0
                return (
                  <span
                    key={c}
                    className={`text-[11px] rounded-full px-2.5 py-0.5 border ${
                      count === 0
                        ? "bg-red-50 border-red-200 text-[#E31C23]"
                        : "bg-white border-gray-200 text-[#4A4A4A]"
                    }`}
                  >
                    {c}: {count}
                  </span>
                )
              })}
            </div>

            {colorsWithoutImages.length > 0 && (
              <p className="text-xs text-[#E31C23] mt-2">
                Sin fotos propias: {colorsWithoutImages.join(", ")}. Se mostrarán las fotos generales.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#4A4A4A] mb-4">
            Este producto aún no tiene variantes sincronizadas, así que no hay colores a los cuales
            asignar fotos. Las imágenes se guardarán como generales.
          </p>
        )}

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center mb-4 cursor-pointer transition-colors ${uploadingFiles ? "border-gray-300 bg-gray-50 cursor-wait" : "border-gray-200 hover:border-[#E31C23]"}`}
          onClick={() => !uploadingFiles && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            void handleFileUpload(e.dataTransfer.files)
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void handleFileUpload(e.target.files)}
          />
          {uploadingFiles ? (
            <p className="text-[#4A4A4A] text-sm animate-pulse">Subiendo imágenes…</p>
          ) : (
            <>
              <p className="text-[#4A4A4A] text-sm">
                <span className="font-semibold">Arrastra o haz click</span> — mínimo 5 fotos
                {uploadColor !== NO_COLOR && (
                  <span className="text-[#1C1C1C] font-semibold"> · color {uploadColor}</span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · máx 10 MB por imagen</p>
            </>
          )}
        </div>
        {uploadError && (
          <p className="text-[#E31C23] text-sm mb-4">{uploadError}</p>
        )}

        {/* URL manual */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            placeholder="URL de imagen (https://…)"
            className={`${inputClass} flex-1`}
          />
          <input
            type="text"
            value={imageAltInput}
            onChange={(e) => setImageAltInput(e.target.value)}
            placeholder="Texto alternativo"
            className={`${inputClass} w-40`}
          />
          <button
            type="button"
            onClick={addImageFromUrl}
            className="bg-[#1C1C1C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#4A4A4A] transition-colors whitespace-nowrap"
          >
            Agregar URL
          </button>
        </div>

        {/* Image list */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {images.map((img, idx) => (
              <DraggableImageCard
                key={img.id ?? img.url}
                image={img}
                index={idx}
                total={images.length}
                isDragSource={draggingIdx === idx}
                isDragTarget={dragOverIdx === idx && draggingIdx !== idx}
                availableColors={variantColors}
                onRemove={() => removeImage(idx)}
                onMove={(dir) => moveImage(idx, dir)}
                onColorChange={(color) => setImageColor(idx, color)}
                onDragEnter={handleDragEnterCard}
                onDragLeave={handleDragLeaveCard}
              />
            ))}
          </div>
        )}
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
