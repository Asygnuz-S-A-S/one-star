"use server"

import { revalidatePath } from "next/cache"
import { createBrand, updateBrand, deleteBrand } from "@/server/services/brand.service"
import { requireAdmin } from "@/server/auth/require-admin"
import { brandInputSchema } from "@/server/validators/brand.validator"
import { faqsFromText, highlightsFromText } from "@/lib/product-faq"
import type { ActionResult } from "@/types/admin"

/**
 * NOTA DE ARQUITECTURA:
 * Cuando se integre el PR de roles de administración (#43), estas acciones
 * deben pasar a requerir rol SUPER_ADMIN.
 */

function parseBrandFormData(formData: FormData) {
  const rawHighlights = (formData.get("highlights") as string) || ""
  const rawFaqs = (formData.get("faqs") as string) || ""

  const highlights = rawHighlights ? highlightsFromText(rawHighlights) : []
  const faqs = rawFaqs ? faqsFromText(rawFaqs) : []

  return {
    name: (formData.get("name") as string)?.trim() ?? "",
    slug: ((formData.get("slug") as string)?.trim()) || undefined,
    logoUrl: ((formData.get("logoUrl") as string)?.trim()) || null,
    bannerUrl: ((formData.get("bannerUrl") as string)?.trim()) || null,
    sizeGuideImageUrl: ((formData.get("sizeGuideImageUrl") as string)?.trim()) || null,
    sizeGuideMenUrl: ((formData.get("sizeGuideMenUrl") as string)?.trim()) || null,
    sizeGuideWomenUrl: ((formData.get("sizeGuideWomenUrl") as string)?.trim()) || null,
    sizeGuideKidsUrl: ((formData.get("sizeGuideKidsUrl") as string)?.trim()) || null,
    sizeGuideNote: ((formData.get("sizeGuideNote") as string)?.trim()) || null,
    description: ((formData.get("description") as string)?.trim()) || null,
    story: ((formData.get("story") as string)?.trim()) || null,
    metaTitle: ((formData.get("metaTitle") as string)?.trim()) || null,
    metaDescription: ((formData.get("metaDescription") as string)?.trim()) || null,
    highlights,
    faqs,
    isActive: formData.get("isActive") !== "false",
  }
}

export async function createBrandAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin("inventory")
    const parsed = parseBrandFormData(formData)
    const validated = brandInputSchema.safeParse(parsed)

    if (!validated.success) {
      const msg = validated.error.issues[0]?.message ?? "Datos de marca inválidos."
      return { success: false, error: msg }
    }

    const brand = await createBrand(validated.data)
    revalidatePath("/admin/marcas")
    revalidatePath("/admin/productos")
    revalidatePath("/marcas")
    return { success: true, id: brand.id }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "Ya existe una marca con ese nombre o slug." }
    }
    return { success: false, error: error instanceof Error ? error.message : "Error al crear la marca." }
  }
}

export async function updateBrandAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin("inventory")
    const parsed = parseBrandFormData(formData)
    const validated = brandInputSchema.safeParse(parsed)

    if (!validated.success) {
      const msg = validated.error.issues[0]?.message ?? "Datos de marca inválidos."
      return { success: false, error: msg }
    }

    await updateBrand(id, validated.data)
    revalidatePath("/admin/marcas")
    revalidatePath("/admin/productos")
    revalidatePath("/marcas")
    revalidatePath(`/marcas/${validated.data.slug ?? ""}`)
    revalidatePath("/")
    return { success: true, id }
  } catch (error) {
    console.error("[updateBrandAction] Error:", error)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "Ya existe una marca con ese nombre o slug." }
    }
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar la marca." }
  }
}

export async function deleteBrandAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin("inventory")
    await deleteBrand(id)
    revalidatePath("/admin/marcas")
    revalidatePath("/admin/productos")
    revalidatePath("/marcas")
    return { success: true }
  } catch {
    return { success: false, error: "La marca tiene productos asociados o no existe." }
  }
}
