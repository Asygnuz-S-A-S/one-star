/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: Banner model exists in schema.prisma but not yet in the generated Prisma client.
// Will resolve after `prisma generate`.
import { prisma } from "@/server/db/prisma"
import BannersClient from "./BannersClient"

const db = prisma as any

export default async function BannersPage() {
  let banners: Array<{
    id: string
    title: string
    imageUrl: string
    linkUrl: string | null
    position: number
    isActive: boolean
    startDate: string | null
    endDate: string | null
    createdAt: string
  }> = []

  try {
    const raw = await db.banner.findMany({
      orderBy: { position: "asc" },
    })
    banners = raw.map((b: any) => ({
      id: b.id,
      title: b.title,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl,
      position: b.position,
      isActive: b.isActive,
      startDate: b.startDate?.toISOString() ?? null,
      endDate: b.endDate?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
    }))
  } catch (error) {
    console.error("[BannersPage]", error)
  }

  return (
    <div className="p-6 md:p-8">
      <BannersClient banners={banners} />
    </div>
  )
}
