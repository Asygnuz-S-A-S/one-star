import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma } from "@prisma/client"

export async function findManyMediaAssets(options?: {
  fileType?: string
  search?: string
  limit?: number
  offset?: number
}) {
  const where: Prisma.MediaAssetWhereInput = {}

  if (options?.fileType && options.fileType !== "all") {
    where.fileType = options.fileType
  }

  if (options?.search?.trim()) {
    where.fileName = {
      contains: options.search.trim(),
      mode: "insensitive",
    }
  }

  return prisma.mediaAsset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  })
}

export async function countMediaAssets(options?: {
  fileType?: string
  search?: string
}) {
  const where: Prisma.MediaAssetWhereInput = {}

  if (options?.fileType && options.fileType !== "all") {
    where.fileType = options.fileType
  }

  if (options?.search?.trim()) {
    where.fileName = {
      contains: options.search.trim(),
      mode: "insensitive",
    }
  }

  return prisma.mediaAsset.count({ where })
}

export async function findMediaAssetById(id: string) {
  return prisma.mediaAsset.findUnique({ where: { id } })
}

export async function findMediaAssetByUrl(url: string) {
  return prisma.mediaAsset.findUnique({ where: { url } })
}

export async function createMediaAssetRecord(data: Prisma.MediaAssetCreateInput) {
  return prisma.mediaAsset.create({ data })
}

export async function deleteMediaAssetRecord(id: string) {
  return prisma.mediaAsset.delete({ where: { id } })
}

export async function findMediaAssetReferences(url: string) {
  const [logos, banners, brands, productImages, landingSections] = await Promise.all([
    prisma.storeLogo.count({ where: { url } }),
    prisma.banner.count({ where: { imageUrl: url } }),
    prisma.brand.count({
      where: {
        OR: [{ logoUrl: url }, { bannerUrl: url }, { sizeGuideImageUrl: url }],
      },
    }),
    prisma.productImage.count({ where: { url } }),
    prisma.landingSection.findMany({ select: { config: true } }),
  ])

  return {
    logos,
    banners,
    brands,
    productImages,
    landingSections: landingSections.filter(({ config }) => JSON.stringify(config).includes(url)).length,
  }
}


export async function findMediaAssetSources() {
  const [logos, banners, brands, productImages] = await Promise.all([
    prisma.storeLogo.findMany(),
    prisma.banner.findMany(),
    prisma.brand.findMany({ where: { logoUrl: { not: null } } }),
    prisma.productImage.findMany({ take: 50, orderBy: { id: "desc" } }),
  ])

  return { logos, banners, brands, productImages }
}
