"use server"

import { revalidatePath } from "next/cache"
import {
  createBanner as createBannerService,
  updateBanner as updateBannerService,
  deleteBanner as deleteBannerService,
  toggleBannerActive as toggleBannerActiveService,
} from "@/server/services/banner.service"
import { requireAdmin } from "@/server/auth/require-admin"

function parseBannerForm(formData: FormData) {
  return {
    title: formData.get("title") as string,
    imageUrl: formData.get("imageUrl") as string,
    mediaType: (formData.get("mediaType") as string) || "image",
    linkUrl: (formData.get("linkUrl") as string) || null,
    position: parseInt(formData.get("position") as string) || 0,
    isActive: formData.get("isActive") === "true",
    startDate: (formData.get("startDate") as string) || null,
    endDate: (formData.get("endDate") as string) || null,
  }
}

export async function createBanner(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const input = parseBannerForm(formData)
  if (!input.title || !input.imageUrl) {
    return { success: false, error: "Título e imagen son obligatorios." }
  }
  try {
    await requireAdmin()
    await createBannerService(input)
    revalidatePath("/admin/banners")
    revalidatePath("/admin/landing-builder")
    revalidatePath("/")
    return { success: true }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[createBanner]", error instanceof Error ? error.message : error)
    }
    return { success: false, error: "Error al crear el banner." }
  }
}

export async function updateBanner(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const input = parseBannerForm(formData)
  try {
    await requireAdmin()
    await updateBannerService(id, input)
    revalidatePath("/admin/banners")
    revalidatePath("/admin/landing-builder")
    revalidatePath("/")
    return { success: true }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[updateBanner]", error instanceof Error ? error.message : error)
    }
    return { success: false, error: "Error al actualizar el banner." }
  }
}

export async function deleteBanner(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    await deleteBannerService(id)
    revalidatePath("/admin/banners")
    revalidatePath("/admin/landing-builder")
    revalidatePath("/")
    return { success: true }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[deleteBanner]", error instanceof Error ? error.message : error)
    }
    return { success: false, error: "Error al eliminar el banner." }
  }
}

export async function toggleBannerActive(
  id: string,
  current: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    await toggleBannerActiveService(id, current)
    revalidatePath("/admin/banners")
    revalidatePath("/admin/landing-builder")
    revalidatePath("/")
    return { success: true }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[toggleBannerActive]", error instanceof Error ? error.message : error)
    }
    return { success: false, error: "Error al cambiar el estado." }
  }
}
