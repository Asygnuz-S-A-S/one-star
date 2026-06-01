"use server"

/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: Some fields (brand, gender, sizeUS, sizeCM, sizeEUR, metaTitle, metaDescription,
// extendedDescription, videoUrl, crossSells) exist in schema.prisma but are not yet
// reflected in the generated Prisma client. They will resolve after `prisma generate`.

import { prisma } from "@/server/db/prisma"
import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/types/admin"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("Unique constraint") || error.message.includes("unique constraint")) {
      if (error.message.includes("slug")) return "Ya existe un producto con ese slug."
      if (error.message.includes("sku")) return "Uno o más SKUs ya están en uso."
      return "Ya existe un registro con esos datos."
    }
    return error.message
  }
  return "Error inesperado"
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  try {
    const name = formData.get("name") as string
    const slug = (formData.get("slug") as string) || slugify(name)
    const brand = formData.get("brand") as string | null
    const gender = formData.get("gender") as string | null
    const categoryId = formData.get("categoryId") as string
    const description = formData.get("description") as string | null
    const extendedDescription = formData.get("extendedDescription") as string | null
    const videoUrl = formData.get("videoUrl") as string | null
    const basePrice = parseFloat(formData.get("basePrice") as string)
    const isOnSale = formData.get("isOnSale") === "true"
    const salePrice = isOnSale ? parseFloat(formData.get("salePrice") as string) : null
    const metaTitle = formData.get("metaTitle") as string | null
    const metaDescription = formData.get("metaDescription") as string | null

    if (!name?.trim()) return { success: false, error: "El nombre es requerido." }
    if (!categoryId?.trim()) return { success: false, error: "La categoría es requerida." }
    if (isNaN(basePrice) || basePrice < 0) return { success: false, error: "El precio base no es válido." }
    if (isOnSale && (salePrice === null || isNaN(salePrice) || salePrice < 0)) {
      return { success: false, error: "El precio de oferta no es válido." }
    }

    const variantsJson = formData.get("variants") as string
    const imagesJson = formData.get("images") as string
    const crossSellIdsJson = formData.get("crossSellIds") as string

    const variants = variantsJson ? JSON.parse(variantsJson) : []
    const images = imagesJson ? JSON.parse(imagesJson) : []
    const crossSellIds: string[] = crossSellIdsJson ? JSON.parse(crossSellIdsJson) : []

    const product = await (prisma.product as any).create({
      data: {
        name: name.trim(),
        slug: slug.trim(),
        brand: brand?.trim() || null,
        gender: gender || null,
        categoryId,
        description: description?.trim() || null,
        extendedDescription: extendedDescription?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
        basePrice,
        isOnSale,
        salePrice: salePrice ?? null,
        metaTitle: metaTitle?.trim() || null,
        metaDescription: metaDescription?.trim() || null,
        variants: {
          create: variants.map((v: Record<string, string>) => ({
            sku: v.sku,
            size: v.size,
            color: v.color,
            stock: parseInt(v.stock) || 0,
            sizeUS: v.sizeUS || null,
            sizeCM: v.sizeCM || null,
            sizeEUR: v.sizeEUR || null,
          })),
        },
        images: {
          create: images.map((img: Record<string, string>, idx: number) => ({
            url: img.url,
            alt: img.alt || name,
            position: idx,
          })),
        },
        crossSells: {
          connect: crossSellIds.map((id) => ({ id })),
        },
      },
    })

    revalidatePath("/admin/productos")
    return { success: true, id: product.id }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const name = formData.get("name") as string
    const slug = (formData.get("slug") as string) || slugify(name)
    const brand = formData.get("brand") as string | null
    const gender = formData.get("gender") as string | null
    const categoryId = formData.get("categoryId") as string
    const description = formData.get("description") as string | null
    const extendedDescription = formData.get("extendedDescription") as string | null
    const videoUrl = formData.get("videoUrl") as string | null
    const basePrice = parseFloat(formData.get("basePrice") as string)
    const isOnSale = formData.get("isOnSale") === "true"
    const salePrice = isOnSale ? parseFloat(formData.get("salePrice") as string) : null
    const metaTitle = formData.get("metaTitle") as string | null
    const metaDescription = formData.get("metaDescription") as string | null

    if (!name?.trim()) return { success: false, error: "El nombre es requerido." }
    if (!categoryId?.trim()) return { success: false, error: "La categoría es requerida." }
    if (isNaN(basePrice) || basePrice < 0) return { success: false, error: "El precio base no es válido." }
    if (isOnSale && (salePrice === null || isNaN(salePrice) || salePrice < 0)) {
      return { success: false, error: "El precio de oferta no es válido." }
    }

    const variantsJson = formData.get("variants") as string
    const imagesJson = formData.get("images") as string
    const crossSellIdsJson = formData.get("crossSellIds") as string

    const variants = variantsJson ? JSON.parse(variantsJson) : []
    const images = imagesJson ? JSON.parse(imagesJson) : []
    const crossSellIds: string[] = crossSellIdsJson ? JSON.parse(crossSellIdsJson) : []

    const db = prisma as any

    await db.$transaction(async (tx: any) => {
      await tx.variant.deleteMany({ where: { productId: id } })
      await tx.productImage.deleteMany({ where: { productId: id } })

      await tx.product.update({
        where: { id },
        data: {
          name: name.trim(),
          slug: slug.trim(),
          brand: brand?.trim() || null,
          gender: gender || null,
          categoryId,
          description: description?.trim() || null,
          extendedDescription: extendedDescription?.trim() || null,
          videoUrl: videoUrl?.trim() || null,
          basePrice,
          isOnSale,
          salePrice: salePrice ?? null,
          metaTitle: metaTitle?.trim() || null,
          metaDescription: metaDescription?.trim() || null,
          variants: {
            create: variants.map((v: Record<string, string>) => ({
              sku: v.sku,
              size: v.size,
              color: v.color,
              stock: parseInt(v.stock) || 0,
              sizeUS: v.sizeUS || null,
              sizeCM: v.sizeCM || null,
              sizeEUR: v.sizeEUR || null,
            })),
          },
          images: {
            create: images.map((img: Record<string, string>, idx: number) => ({
              url: img.url,
              alt: img.alt || name,
              position: idx,
            })),
          },
          crossSells: {
            set: crossSellIds.map((csId) => ({ id: csId })),
          },
        },
      })
    })

    revalidatePath("/admin/productos")
    revalidatePath(`/admin/productos/${id}`)
    return { success: true, id }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await prisma.product.delete({ where: { id } })
    revalidatePath("/admin/productos")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function searchProducts(
  q: string,
  excludeId?: string
): Promise<{ id: string; name: string; brand: string | null }[]> {
  const products = await (prisma.product as any).findMany({
    where: {
      AND: [
        { name: { contains: q, mode: "insensitive" } },
        excludeId ? { id: { not: excludeId } } : {},
      ],
    },
    select: { id: true, name: true, brand: true },
    take: 8,
  }) as { id: string; name: string; brand: string | null }[]
  return products
}
