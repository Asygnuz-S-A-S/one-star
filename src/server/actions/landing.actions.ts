"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "../db/prisma"
import { requireAdmin } from "@/server/auth/require-admin"
import type { Prisma, LandingSectionType } from "@prisma/client"

export async function updateLandingSectionPositionsAction(
  updates: { id: string; position: number }[]
) {
  try {
    await requireAdmin()
    await prisma.$transaction(
      updates.map((update) =>
        prisma.landingSection.update({
          where: { id: update.id },
          data: { position: update.position },
        })
      )
    )
    revalidatePath("/")
    revalidatePath("/admin/landing-builder")
    return { success: true }
  } catch (error) {
    console.error("Error updating landing section positions:", error)
    return { success: false, error: "Failed to update positions" }
  }
}

export async function toggleLandingSectionActiveAction(id: string, isActive: boolean) {
  try {
    await requireAdmin()
    await prisma.landingSection.update({
      where: { id },
      data: { isActive },
    })
    revalidatePath("/")
    revalidatePath("/admin/landing-builder")
    return { success: true }
  } catch (error) {
    console.error("Error toggling landing section:", error)
    return { success: false, error: "Failed to toggle section" }
  }
}

export async function updateLandingSectionConfigAction(id: string, config: Prisma.InputJsonValue) {
  try {
    await requireAdmin()
    await prisma.landingSection.update({
      where: { id },
      data: { config },
    })
    revalidatePath("/")
    revalidatePath("/admin/landing-builder")
    return { success: true }
  } catch (error) {
    console.error("Error updating landing section config:", error)
    return { success: false, error: "Failed to update config" }
  }
}

export async function createLandingSectionAction(type: LandingSectionType) {
  try {
    await requireAdmin()
    const maxPosition = await prisma.landingSection.aggregate({
      _max: { position: true },
    })
    const position = (maxPosition._max.position || 0) + 1

    const newSection = await prisma.landingSection.create({
      data: {
        type,
        position,
        isActive: true,
      },
    })
    revalidatePath("/")
    revalidatePath("/admin/landing-builder")
    return { success: true, newSection }
  } catch (error) {
    console.error("Error creating landing section:", error)
    return { success: false, error: "Failed to create section" }
  }
}

export async function deleteLandingSectionAction(id: string) {
  try {
    await requireAdmin()
    await prisma.landingSection.delete({
      where: { id },
    })
    revalidatePath("/")
    revalidatePath("/admin/landing-builder")
    return { success: true }
  } catch (error) {
    console.error("Error deleting landing section:", error)
    return { success: false, error: "Failed to delete section" }
  }
}
