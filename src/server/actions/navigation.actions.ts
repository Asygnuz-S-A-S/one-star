"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "../db/prisma"

export async function createNavigationItemAction(label: string, href: string, isSale: boolean) {
  try {
    const maxPos = await prisma.navigationItem.aggregate({
      _max: { position: true }
    })
    const position = (maxPos._max.position || 0) + 1

    const item = await prisma.navigationItem.create({
      data: { label, href, isSale, position }
    })
    revalidatePath("/admin/navegacion")
    revalidatePath("/")
    return { success: true, data: item }
  } catch (error) {
    console.error("Error creating nav item:", error)
    return { success: false, error: "Error al crear el enlace" }
  }
}

export async function updateNavigationItemAction(id: string, label: string, href: string, isSale: boolean) {
  try {
    await prisma.navigationItem.update({
      where: { id },
      data: { label, href, isSale }
    })
    revalidatePath("/admin/navegacion")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error updating nav item:", error)
    return { success: false, error: "Error al actualizar el enlace" }
  }
}

export async function deleteNavigationItemAction(id: string) {
  try {
    await prisma.navigationItem.delete({ where: { id } })
    revalidatePath("/admin/navegacion")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error deleting nav item:", error)
    return { success: false, error: "Error al eliminar el enlace" }
  }
}

export async function updateNavigationPositionsAction(
  updates: { id: string; position: number }[]
) {
  try {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.navigationItem.update({
          where: { id: update.id },
          data: { position: update.position },
        })
      )
    )
    revalidatePath("/admin/navegacion")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error updating nav positions:", error)
    return { success: false, error: "Failed to update positions" }
  }
}

export async function toggleNavigationItemActiveAction(id: string, isActive: boolean) {
  try {
    await prisma.navigationItem.update({
      where: { id },
      data: { isActive },
    })
    revalidatePath("/admin/navegacion")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error toggling nav item:", error)
    return { success: false, error: "Failed to toggle nav item" }
  }
}
