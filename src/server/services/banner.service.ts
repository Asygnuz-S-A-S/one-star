import "server-only"
import {
  findManyBanners,
  getActiveBanners,
  createBannerRecord,
  updateBannerRecord,
  deleteBannerRecord,
} from "../repositories/banner.repository"
import type { Banner } from "@prisma/client"
import { BannerInputSchema, type BannerInput } from "@/server/validators/banner.validator"

export interface BannerDTO {
  id: string
  title: string
  imageUrl: string
  mediaType: string
  linkUrl: string | null
  position: number
  isActive: boolean
  startDate: string | null
  endDate: string | null
  createdAt: string
}

export function mapToDTO(banner: Banner): BannerDTO {
  return {
    id: banner.id,
    title: banner.title,
    imageUrl: banner.imageUrl,
    mediaType: banner.mediaType ?? "image",
    linkUrl: banner.linkUrl,
    position: banner.position,
    isActive: banner.isActive,
    startDate: banner.startDate?.toISOString() ?? null,
    endDate: banner.endDate?.toISOString() ?? null,
    createdAt: banner.createdAt.toISOString(),
  }
}

function parseBannerDate(value: string | null | undefined, endOfDay = false): Date | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}-05:00`)
  }
  return new Date(value)
}

export async function getAllBanners(): Promise<BannerDTO[]> {
  const banners = await findManyBanners()
  return banners.map(mapToDTO)
}

export async function getVisibleBanners(): Promise<BannerDTO[]> {
  const banners = await getActiveBanners()
  return banners.map(mapToDTO)
}

export async function createBanner(input: BannerInput): Promise<BannerDTO> {
  const data = BannerInputSchema.parse(input)
  const banner = await createBannerRecord({
    title: data.title,
    imageUrl: data.imageUrl,
    mediaType: data.mediaType,
    linkUrl: data.linkUrl || null,
    position: data.position,
    isActive: data.isActive,
    startDate: parseBannerDate(data.startDate),
    endDate: parseBannerDate(data.endDate, true),
  })
  return mapToDTO(banner)
}

export async function updateBanner(id: string, input: BannerInput): Promise<BannerDTO> {
  const data = BannerInputSchema.parse(input)
  const banner = await updateBannerRecord(id, {
    title: data.title,
    imageUrl: data.imageUrl,
    mediaType: data.mediaType,
    linkUrl: data.linkUrl || null,
    position: data.position,
    isActive: data.isActive,
    startDate: parseBannerDate(data.startDate),
    endDate: parseBannerDate(data.endDate, true),
  })
  return mapToDTO(banner)
}

export async function deleteBanner(id: string): Promise<void> {
  await deleteBannerRecord(id)
}

export async function toggleBannerActive(id: string, current: boolean): Promise<void> {
  await updateBannerRecord(id, { isActive: !current })
}
