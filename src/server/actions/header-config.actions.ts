"use server"

import { updateHeaderConfig } from "@/server/repositories/header-config.repository"
import { revalidatePath } from "next/cache"

export async function updateHeaderConfigAction(data: {
  layout: string
  navAlignment: string
  showSearch: boolean
  showCart: boolean
  showUser: boolean
  bgColor: string
  textColor: string
  hasBorderBottom: boolean
  bgOpacity: number
  useBlur: boolean
  margin: string
  padding: string
  borderRadius: string
}) {
  try {
    const { id, updatedAt, ...safeData } = data as any;
    const config = await updateHeaderConfig(safeData)
    revalidatePath("/", "layout")
    return { success: true, data: config }
  } catch (error: any) {
    console.error("Error updating header config:", error)
    return { success: false, error: error.message }
  }
}
