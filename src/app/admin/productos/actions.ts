"use server"

import { revalidatePath } from "next/cache"
import {
  createProduct as createProductService,
  updateProduct as updateProductService,
  deleteProduct as deleteProductService,
  searchProducts as searchProductsService,
} from "@/server/services/product.service"
import { productFormSchema } from "@/server/validators/product.validator"
import { slugify } from "@/lib/utils"
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

function extractFormData(formData: FormData) {
  const name = (formData.get("name") as string ?? "").trim()
  return {
    name,
    slug: ((formData.get("slug") as string) || slugify(name)).trim() || undefined,
    brandId: (formData.get("brandId") as string)?.trim() || null,
    gender: (formData.get("gender") as string) || null,
    categoryId: (formData.get("categoryId") as string ?? "").trim(),
    description: (formData.get("description") as string)?.trim() || null,
    extendedDescription: (formData.get("extendedDescription") as string)?.trim() || null,
    videoUrl: (formData.get("videoUrl") as string)?.trim() || null,
    basePrice: formData.get("basePrice"),
    isOnSale: formData.get("isOnSale") === "true",
    salePrice: formData.get("isOnSale") === "true" ? formData.get("salePrice") : null,
    metaTitle: (formData.get("metaTitle") as string)?.trim() || null,
    metaDescription: (formData.get("metaDescription") as string)?.trim() || null,
    availableOnline: formData.get("availableOnline") !== "false",
    availableInStores: formData.get("availableInStores") !== "false",
    isPublished: formData.get("isPublished") !== "false",
    variants: JSON.parse((formData.get("variants") as string) || "[]"),
    images: JSON.parse((formData.get("images") as string) || "[]"),
    colorFamilyProductIds: JSON.parse((formData.get("colorFamilyProductIds") as string) || "[]"),
    colorFamilyBaselineProductIds: JSON.parse(
      (formData.get("colorFamilyBaselineProductIds") as string) || "[]"
    ),
    crossSellIds: JSON.parse((formData.get("crossSellIds") as string) || "[]"),
  }
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const raw = extractFormData(formData)
  const parsed = productFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
  }

  const data = parsed.data
  const slug = data.slug || slugify(data.name)

  try {
    await requireAdmin()
    const product = await createProductService({
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
    revalidatePath("/productos")
    return { success: true, id: product.id }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const raw = extractFormData(formData)
  const parsed = productFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
  }

  const data = parsed.data
  const slug = data.slug || slugify(data.name)

  try {
    await requireAdmin()
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
