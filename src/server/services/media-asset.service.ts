import "server-only"
import {
  findManyMediaAssets,
  countMediaAssets,
  findMediaAssetById,
  findMediaAssetByUrl,
  createMediaAssetRecord,
  deleteMediaAssetRecord,
} from "../repositories/media-asset.repository"
import { prisma } from "../db/prisma"
import type { MediaAsset } from "@prisma/client"

export interface MediaAssetDTO {
  id: string
  url: string
  publicId: string | null
  fileName: string
  fileType: string
  mimeType: string | null
  fileSize: number | null
  folder: string | null
  createdAt: Date
  updatedAt: Date
}

function mapToDTO(asset: MediaAsset): MediaAssetDTO {
  return {
    id: asset.id,
    url: asset.url,
    publicId: asset.publicId,
    fileName: asset.fileName,
    fileType: asset.fileType,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
    folder: asset.folder,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  }
}

export async function getMediaAssets(options?: {
  fileType?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ items: MediaAssetDTO[]; total: number }> {
  // Si la tabla está vacía, auto-sincronizar recursos existentes
  const currentCount = await countMediaAssets()
  if (currentCount === 0) {
    await autoSyncExistingAssets().catch((err) => {
      console.warn("[MediaAssetService] Auto-sync advertencia:", err)
    })
  }

  const [assets, total] = await Promise.all([
    findManyMediaAssets(options),
    countMediaAssets(options),
  ])

  return {
    items: assets.map(mapToDTO),
    total,
  }
}

export async function createMediaAsset(input: {
  url: string
  publicId?: string | null
  fileName: string
  fileType: string
  mimeType?: string | null
  fileSize?: number | null
  folder?: string | null
}): Promise<MediaAssetDTO> {
  const existing = await findMediaAssetByUrl(input.url)
  if (existing) {
    return mapToDTO(existing)
  }

  const asset = await createMediaAssetRecord({
    url: input.url,
    publicId: input.publicId ?? null,
    fileName: input.fileName,
    fileType: input.fileType,
    mimeType: input.mimeType ?? null,
    fileSize: input.fileSize ?? null,
    folder: input.folder ?? "general",
  })

  return mapToDTO(asset)
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const asset = await findMediaAssetById(id)
  if (!asset) return
  await deleteMediaAssetRecord(id)
}

/**
 * Escanea imágenes ya existentes en StoreLogo, Banner, Brand y ProductImage
 * y las registra en MediaAsset para que aparezcan en la biblioteca.
 */
export async function autoSyncExistingAssets(): Promise<number> {
  let synced = 0

  // 1. StoreLogos
  const logos = await prisma.storeLogo.findMany()
  for (const logo of logos) {
    if (logo.url) {
      const existing = await findMediaAssetByUrl(logo.url)
      if (!existing) {
        await createMediaAssetRecord({
          url: logo.url,
          fileName: logo.fileName || `logo-${logo.type || "store"}.png`,
          fileType: "image",
          folder: "logos",
        })
        synced++
      }
    }
  }

  // 2. Banners
  const banners = await prisma.banner.findMany()
  for (const banner of banners) {
    if (banner.imageUrl) {
      const existing = await findMediaAssetByUrl(banner.imageUrl)
      if (!existing) {
        await createMediaAssetRecord({
          url: banner.imageUrl,
          fileName: banner.title ? `${banner.title.toLowerCase().replace(/\s+/g, "-")}.jpg` : "banner.jpg",
          fileType: banner.mediaType === "video" ? "video" : "image",
          folder: "banners",
        })
        synced++
      }
    }
  }

  // 3. Brands
  const brands = await prisma.brand.findMany({ where: { logoUrl: { not: null } } })
  for (const brand of brands) {
    if (brand.logoUrl) {
      const existing = await findMediaAssetByUrl(brand.logoUrl)
      if (!existing) {
        await createMediaAssetRecord({
          url: brand.logoUrl,
          fileName: `${brand.name.toLowerCase().replace(/\s+/g, "-")}-logo.png`,
          fileType: "image",
          folder: "marcas",
        })
        synced++
      }
    }
  }

  // 4. Product Images (hasta 50 registros)
  const productImages = await prisma.productImage.findMany({
    take: 50,
    orderBy: { id: "desc" },
  })
  for (const pImg of productImages) {
    if (pImg.url) {
      const existing = await findMediaAssetByUrl(pImg.url)
      if (!existing) {
        await createMediaAssetRecord({
          url: pImg.url,
          fileName: pImg.alt ? `${pImg.alt.toLowerCase().replace(/\s+/g, "-")}.jpg` : "producto.jpg",
          fileType: "image",
          folder: "productos",
        })
        synced++
      }
    }
  }

  return synced
}
