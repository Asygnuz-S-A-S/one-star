"use server"

/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: Banner model exists in schema.prisma but not yet in the generated Prisma client.
// Will resolve after `prisma generate`.
import { prisma } from "@/server/db/prisma"
import { revalidatePath } from "next/cache"

const db = prisma as any

export async function createBanner(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const title = formData.get("title") as string
    const imageUrl = formData.get("imageUrl") as string
    const linkUrl = (formData.get("linkUrl") as string) || null
    const position = parseInt(formData.get("position") as string) || 0
    const isActive = formData.get("isActive") === "true"
    const startDateRaw = formData.get("startDate") as string
    const endDateRaw = formData.get("endDate") as string

    if (!title || !imageUrl) {
      return { success: false, error: "Título e imagen son obligatorios." }
    }

    await db.banner.create({
      data: {
        title,
        imageUrl,
        linkUrl,
        position,
        isActive,
        startDate: startDateRaw ? new Date(startDateRaw) : null,
        endDate: endDateRaw ? new Date(endDateRaw) : null,
      },
    })
    revalidatePath("/admin/banners")
    return { success: true }
  } catch (error) {
    console.error("[createBanner]", error)
    return { success: false, error: "Error al crear el banner." }
  }
}

export async function updateBanner(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const title = formData.get("title") as string
    const imageUrl = formData.get("imageUrl") as string
    const linkUrl = (formData.get("linkUrl") as string) || null
    const position = parseInt(formData.get("position") as string) || 0
    const isActive = formData.get("isActive") === "true"
    const startDateRaw = formData.get("startDate") as string
    const endDateRaw = formData.get("endDate") as string

    await db.banner.update({
      where: { id },
      data: {
        title,
        imageUrl,
        linkUrl,
        position,
        isActive,
        startDate: startDateRaw ? new Date(startDateRaw) : null,
        endDate: endDateRaw ? new Date(endDateRaw) : null,
      },
    })
    revalidatePath("/admin/banners")
    return { success: true }
  } catch (error) {
    console.error("[updateBanner]", error)
    return { success: false, error: "Error al actualizar el banner." }
  }
}

export async function deleteBanner(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.banner.delete({ where: { id } })
    revalidatePath("/admin/banners")
    return { success: true }
  } catch (error) {
    console.error("[deleteBanner]", error)
    return { success: false, error: "Error al eliminar el banner." }
  }
}

export async function toggleBannerActive(
  id: string,
  current: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.banner.update({
      where: { id },
      data: { isActive: !current },
    })
    revalidatePath("/admin/banners")
    return { success: true }
  } catch (error) {
    console.error("[toggleBannerActive]", error)
    return { success: false, error: "Error al cambiar el estado." }
  }
}
