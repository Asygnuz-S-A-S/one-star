"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "../db/prisma"

export async function createCategoryAction(name: string, slug: string) {
  try {
    const existing = await prisma.category.findUnique({ where: { slug } })
    if (existing) {
      return { success: false, error: "El slug ya existe" }
    }
    await prisma.category.create({
      data: { name, slug }
    })
    revalidatePath("/admin/categorias")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error creating category:", error)
    return { success: false, error: "Error al crear la categoría" }
  }
}

export async function updateCategoryAction(id: string, name: string, slug: string) {
  try {
    const existing = await prisma.category.findUnique({ where: { slug } })
    if (existing && existing.id !== id) {
      return { success: false, error: "El slug ya está en uso por otra categoría" }
    }
    await prisma.category.update({
      where: { id },
      data: { name, slug }
    })
    revalidatePath("/admin/categorias")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error updating category:", error)
    return { success: false, error: "Error al actualizar la categoría" }
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    // Check if category has products
    const productsCount = await prisma.product.count({ where: { categoryId: id } })
    if (productsCount > 0) {
      return { success: false, error: `No se puede eliminar porque tiene ${productsCount} productos asignados.` }
    }
    
    await prisma.category.delete({ where: { id } })
    revalidatePath("/admin/categorias")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error deleting category:", error)
    return { success: false, error: "Error al eliminar la categoría" }
  }
}
