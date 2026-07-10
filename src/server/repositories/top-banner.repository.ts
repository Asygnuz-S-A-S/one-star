import { prisma } from "@/server/db/prisma"
import { TopBanner } from "@prisma/client"

export async function getTopBanner(): Promise<TopBanner | null> {
  // Buscamos el primero que exista, o null si no hay ninguno
  return prisma.topBanner.findFirst()
}

export async function updateTopBanner(data: {
  text: string
  btnText?: string | null
  btnUrl?: string | null
  messages?: any
  bgColor: string
  textColor: string
  isActive: boolean
}): Promise<TopBanner> {
  const existing = await getTopBanner()
  
  if (existing) {
    return prisma.topBanner.update({
      where: { id: existing.id },
      data
    })
  } else {
    // Si no existe, creamos uno nuevo
    return prisma.topBanner.create({
      data
    })
  }
}
