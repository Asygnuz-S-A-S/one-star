"use server"

import { revalidatePath } from "next/cache"
import {
  updateProduct as updateProductService,
  deleteProduct as deleteProductService,
  searchProducts as searchProductsService,
  updateProductsPublishStatus as updateProductsPublishStatusService,
} from "@/server/services/product.service"
import {
  bulkProductPublishStatusSchema,
  productFormSchema,
} from "@/server/validators/product.validator"
import { slugify } from "@/lib/utils"
import { faqsFromText, highlightsFromText } from "@/lib/product-faq"
import { requireAdmin } from "@/server/auth/require-admin"
import type { ActionResult } from "@/types/admin"

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (
      error.message.includes("Unique constraint") ||
      error.message.includes("unique constraint")
    ) {
      if (error.message.includes("slug")) return "Ya existe un producto con ese slug."
      if (error.message.includes("sku")) return "Uno o más SKUs ya están en uso."
      return "Ya existe un registro con esos datos."
    }
    return error.message
  }
  return "Error inesperado"
}

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function parseJsonArray(formData: FormData, key: string): unknown[] {
  const value = formValue(formData, key)
  if (!value) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) throw new Error("not an array")
    return parsed
  } catch {
    throw new Error(`El campo ${key} tiene un formato inválido.`)
  }
}

function extractFormData(formData: FormData) {
  const name = formValue(formData, "name").trim()
  return {
    name,
    slug: (formValue(formData, "slug") || slugify(name)).trim() || undefined,
    brandId: formValue(formData, "brandId").trim() || null,
    gender: formValue(formData, "gender") || null,
    categoryId: formValue(formData, "categoryId").trim(),
    description: formValue(formData, "description").trim() || null,
    extendedDescription: formValue(formData, "extendedDescription").trim() || null,
    videoUrl: formValue(formData, "videoUrl").trim() || null,
    basePrice: formData.get("basePrice"),
    isOnSale: formValue(formData, "isOnSale") === "true",
    salePrice: formValue(formData, "isOnSale") === "true" ? formData.get("salePrice") : null,
    metaTitle: formValue(formData, "metaTitle").trim() || null,
    metaDescription: formValue(formData, "metaDescription").trim() || null,
    availableOnline: formValue(formData, "availableOnline") !== "false",
    availableInStores: formValue(formData, "availableInStores") !== "false",
    isPublished: formValue(formData, "isPublished") !== "false",
    highlights: highlightsFromText(formValue(formData, "highlights")),
    faqs: faqsFromText(formValue(formData, "faqs")),
    variants: parseJsonArray(formData, "variants"),
    images: parseJsonArray(formData, "images"),
    colorFamilyProductIds: parseJsonArray(formData, "colorFamilyProductIds"),
    colorFamilyBaselineProductIds: parseJsonArray(formData, "colorFamilyBaselineProductIds"),
    crossSellIds: parseJsonArray(formData, "crossSellIds"),
  }
}

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const raw = extractFormData(formData)
    const parsed = productFormSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
    }

    const data = parsed.data
    const slug = data.slug || slugify(data.name)

    await updateProductService(id, {
      ...data,
      slug,
      variants: data.variants.map((v) => ({
        sku: v.sku,
        size: v.size,
        color: v.color,
        stock: v.stock,
        inventory: v.inventory || [],
        sizeUS: v.sizeUS ?? null,
        sizeCM: v.sizeCM ?? null,
        sizeEUR: v.sizeEUR ?? null,
      })),
      images: data.images.map((img, idx) => ({
        url: img.url,
        alt: img.alt ?? data.name,
        position: img.position ?? idx,
        color: img.color ?? null,
      })),
    })

    revalidatePath("/admin/productos")
    revalidatePath(`/admin/productos/${id}`)
    revalidatePath("/productos")
    revalidatePath(`/productos/${slug}`)
    return { success: true, id }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    await deleteProductService(id)
    revalidatePath("/admin/productos")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function searchProducts(
  q: string,
  excludeId?: string
): Promise<Array<{
  id: string
  slug: string
  name: string
  brandId: string | null
  brandName: string | null
  colorFamilyId: string | null
  imageUrl: string | null
  color: string | null
}>> {
  await requireAdmin()
  return searchProductsService(q, excludeId)
}

export async function bulkToggleProductsPublishStatus(
  ids: string[],
  isPublished: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const parsed = bulkProductPublishStatusSchema.safeParse({ ids, isPublished })
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      }
    }

    await updateProductsPublishStatusService(parsed.data.ids, parsed.data.isPublished)
    revalidatePath("/admin/productos")
    revalidatePath("/productos") // Revalidate frontend catalog
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) }
  }
}
