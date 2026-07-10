"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "../db/prisma"

export async function createStoreAction(data: {
  name: string
  address: string
  city: string
  phone?: string
  schedule?: string
  latitude?: number | null
  longitude?: number | null
  isActive: boolean
}) {
  try {
    await prisma.storeLocation.create({ data })
    revalidatePath("/admin/tiendas")
    revalidatePath("/tiendas")
    return { success: true }
  } catch (error) {
    console.error("Error creating store:", error)
    return { success: false, error: "Error al crear la sucursal" }
  }
}

export async function updateStoreAction(id: string, data: {
  name: string
  address: string
  city: string
  phone?: string
  schedule?: string
  googleMapsUrl?: string
  latitude?: number | null
  longitude?: number | null
  isActive: boolean
}) {
  try {
    await prisma.storeLocation.update({
      where: { id },
      data
    })
    revalidatePath("/admin/tiendas")
    revalidatePath("/tiendas")
    return { success: true }
  } catch (error) {
    console.error("Error updating store:", error)
    return { success: false, error: "Error al actualizar la sucursal" }
  }
}

export async function deleteStoreAction(id: string) {
  try {
    await prisma.storeLocation.delete({ where: { id } })
    revalidatePath("/admin/tiendas")
    revalidatePath("/tiendas")
    return { success: true }
  } catch (error) {
    console.error("Error deleting store:", error)
    return { success: false, error: "Error al eliminar la sucursal" }
  }
}

export async function toggleStoreActiveAction(id: string, isActive: boolean) {
  try {
    await prisma.storeLocation.update({
      where: { id },
      data: { isActive },
    })
    revalidatePath("/admin/tiendas")
    revalidatePath("/tiendas")
    return { success: true }
  } catch (error) {
    console.error("Error toggling store:", error)
    return { success: false, error: "Error al cambiar el estado de la sucursal" }
  }
}
