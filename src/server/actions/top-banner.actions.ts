"use server"

import { updateTopBanner } from "@/server/repositories/top-banner.repository"
import { revalidatePath } from "next/cache"

export async function updateTopBannerAction(data: {
  text: string
  btnText?: string | null
  btnUrl?: string | null
  messages?: any
  bgColor: string
  textColor: string
  isActive: boolean
}) {
  try {
    console.log("Updating TopBanner with data:", JSON.stringify(data, null, 2))
    const updated = await updateTopBanner(data)
    revalidatePath("/", "layout")
    return { success: true, data: updated }
  } catch (error: any) {
    console.error("Error updating top banner:", error)
    return { success: false, error: error.message || "Error al actualizar el banner" }
  }
}
