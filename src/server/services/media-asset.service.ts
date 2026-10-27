import "server-only"
import {
  findManyMediaAssets,
  countMediaAssets,
  findMediaAssetById,
  findMediaAssetByUrl,
  createMediaAssetRecord,
  deleteMediaAssetRecord,
  findMediaAssetReferences,
  findMediaAssetSources,
} from "../repositories/media-asset.repository"
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

export async function getMediaAssetDeletionInfo(id: string) {
  const asset = await findMediaAssetById(id)
  if (!asset) {
    return { exists: false, referenceCount: 0, references: null }
  }

  const references = await findMediaAssetReferences(asset.url)
  return {
    exists: true,
    referenceCount: Object.values(references).reduce((total, count) => total + count, 0),
    references,
  }
}

/**
 * Escanea imágenes ya existentes en StoreLogo, Banner, Brand y ProductImage
 * y las registra en MediaAsset para que aparezcan en la biblioteca.
 */
export async function autoSyncExistingAssets(): Promise<number> {
  const { logos, banners, brands, productImages } = await findMediaAssetSources()
  let synced = 0

  const register = async (asset: Parameters<typeof createMediaAssetRecord>[0]) => {
    if (await findMediaAssetByUrl(asset.url)) return
    await createMediaAssetRecord(asset)
    synced++
  }

  for (const logo of logos) {
    if (logo.url) {
      await register({
        url: logo.url,
        fileName: logo.fileName || `logo-${logo.type || "store"}.png`,
        fileType: "image",
        folder: "logos",
      })
    }
  }

  for (const banner of banners) {
    if (banner.imageUrl) {
      await register({
        url: banner.imageUrl,
        fileName: banner.title ? `${banner.title.toLowerCase().replace(/\s+/g, "-")}.jpg` : "banner.jpg",
        fileType: banner.mediaType === "video" ? "video" : "image",
        folder: "banners",
      })
    }
  }

  for (const brand of brands) {
    if (brand.logoUrl) {
      await register({
        url: brand.logoUrl,
        fileName: `${brand.name.toLowerCase().replace(/\s+/g, "-")}-logo.png`,
        fileType: "image",
        folder: "marcas",
      })
    }
  }

  for (const image of productImages) {
    if (image.url) {
      await register({
        url: image.url,
        fileName: image.alt ? `${image.alt.toLowerCase().replace(/\s+/g, "-")}.jpg` : "producto.jpg",
        fileType: "image",
        folder: "productos",
      })
    }
  }

  return synced
}
