import "server-only"
import { prisma } from "@/server/db/prisma"
import { StoreLogo } from "@prisma/client"

export async function getAllStoreLogos(): Promise<StoreLogo[]> {
  return prisma.storeLogo.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function getPrimaryLogos(): Promise<{
  desktop: StoreLogo | null,
  mobile: StoreLogo | null,
  large: StoreLogo | null
}> {
  const primaryLogos = await prisma.storeLogo.findMany({
    where: { isPrimary: true }
  })

  // Por ahora devolvemos el principal de cada tipo (se asume que hay un primary por tipo, si hay más toma el primero)
  return {
    desktop: primaryLogos.find(l => l.type === 'desktop') || null,
    mobile: primaryLogos.find(l => l.type === 'mobile') || null,
    large: primaryLogos.find(l => l.type === 'large') || null,
  }
}

export async function addStoreLogo(data: {
  url: string
  fileName?: string
  type: string
  theme: string
  isPrimary: boolean
}): Promise<StoreLogo> {
  // Si este será principal, quitamos el principal a los demás del mismo tipo
  if (data.isPrimary) {
    await prisma.storeLogo.updateMany({
      where: { type: data.type, isPrimary: true },
      data: { isPrimary: false }
    })
  }

  return prisma.storeLogo.create({
    data
  })
}

export async function setPrimaryStoreLogo(id: string, type: string): Promise<void> {
  // Quitamos principal a todos los del mismo tipo
  await prisma.storeLogo.updateMany({
    where: { type, isPrimary: true },
    data: { isPrimary: false }
  })

  // Ponemos principal a este
  await prisma.storeLogo.update({
    where: { id },
    data: { isPrimary: true }
  })
}

export async function updateStoreLogoTheme(id: string, theme: string): Promise<StoreLogo> {
  return prisma.storeLogo.update({
    where: { id },
    data: { theme }
  })
}

export async function deleteStoreLogo(id: string): Promise<void> {
  await prisma.storeLogo.delete({
    where: { id }
  })
}
