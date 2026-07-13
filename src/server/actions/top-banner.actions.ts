"use server"

import { updateTopBanner } from "@/server/repositories/top-banner.repository"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/server/auth/require-admin"

export interface TopBannerMessageInput {
  text: string
  url?: string
}

export async function updateTopBannerAction(data: {
  text: string
  btnText?: string | null
  btnUrl?: string | null
  messages?: TopBannerMessageInput[]
  bgColor: string
  textColor: string
  isActive: boolean
}) {
  try {
    await requireAdmin()
    const updated = await updateTopBanner(data)
    revalidatePath("/", "layout")
    return { success: true, data: updated }
  } catch (error: unknown) {
    console.error("Error updating top banner:", error)
    const message = error instanceof Error ? error.message : "Error al actualizar el banner"
    return { success: false, error: message }
  }
}
