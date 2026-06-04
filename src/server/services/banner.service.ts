import "server-only"
import {
  findManyBanners,
  getActiveBanners,
  createBannerRecord,
  updateBannerRecord,
  deleteBannerRecord,
} from "../repositories/banner.repository"
import type { Banner } from "@prisma/client"

export interface BannerDTO {
  id: string
  title: string
  imageUrl: string
  linkUrl: string | null
  position: number
  isActive: boolean
  startDate: string | null
  endDate: string | null
}

export interface BannerInput {
  title: string
  imageUrl: string
  linkUrl?: string | null
  position?: number
  isActive?: boolean
  startDate?: string | null
  endDate?: string | null
}

export function mapToDTO(banner: Banner): BannerDTO {
  return {
    id: banner.id,
    title: banner.title,
    imageUrl: banner.imageUrl,
    linkUrl: banner.linkUrl,
    position: banner.position,
    isActive: banner.isActive,
    startDate: banner.startDate?.toISOString() ?? null,
    endDate: banner.endDate?.toISOString() ?? null,
  }
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
  const banner = await createBannerRecord({
    title: input.title,
    imageUrl: input.imageUrl,
    linkUrl: input.linkUrl ?? null,
    position: input.position ?? 0,
    isActive: input.isActive ?? true,
    startDate: input.startDate ? new Date(input.startDate) : null,
    endDate: input.endDate ? new Date(input.endDate) : null,
  })
  return mapToDTO(banner)
}

export async function updateBanner(id: string, input: BannerInput): Promise<BannerDTO> {
  const banner = await updateBannerRecord(id, {
    title: input.title,
    imageUrl: input.imageUrl,
    linkUrl: input.linkUrl ?? null,
    position: input.position ?? 0,
    isActive: input.isActive ?? true,
    startDate: input.startDate ? new Date(input.startDate) : null,
    endDate: input.endDate ? new Date(input.endDate) : null,
  })
  return mapToDTO(banner)
}

export async function deleteBanner(id: string): Promise<void> {
  await deleteBannerRecord(id)
}

export async function toggleBannerActive(id: string, current: boolean): Promise<void> {
  await updateBannerRecord(id, { isActive: !current })
}
