import "server-only"

import type { Prisma } from "@prisma/client"
import * as repository from "@/server/repositories/landing-section.repository"
import {
  LandingSectionConfigSchema,
  LandingSectionPositionsSchema,
  LandingSectionTypeSchema,
} from "@/server/validators/landing-section.validator"

export async function getAllLandingSections() {
  return repository.getAllLandingSections()
}

export async function updateLandingSectionPositions(updates: { id: string; position: number }[]) {
  return repository.updateLandingSectionPositions(LandingSectionPositionsSchema.parse(updates))
}

export async function setLandingSectionActive(id: string, isActive: boolean) {
  return repository.updateLandingSection(id, { isActive })
}

export async function updateLandingSectionConfig(id: string, config: Prisma.InputJsonValue) {
  const validConfig = LandingSectionConfigSchema.parse(config) as Prisma.InputJsonObject
  return repository.updateLandingSection(id, { config: validConfig })
}

export async function createLandingSection(type: string) {
  const validType = LandingSectionTypeSchema.parse(type)
  const position = (await repository.getMaximumLandingSectionPosition()) + 1

  let defaultConfig: Prisma.InputJsonObject = {}
  if (validType === "MEDIA_CAROUSEL") {
    defaultConfig = {
      title: "PROMOS Y NOVEDADES",
      subtitle: "Descubre las últimas tendencias y colecciones exclusivas",
      layout: "full-width",
      height: "medium",
      animation: "slide",
      autoplay: true,
      autoplayInterval: 6,
      showArrows: true,
      showDots: true,
      items: [
        {
          id: "slide-" + Date.now(),
          mediaType: "image",
          imageUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1920&auto=format&fit=crop",
          badge: "NUEVA TEMPORADA",
          title: "ESTILO URBANO SIN LÍMITES",
          subtitle: "Descubre los últimos lanzamientos diseñados para destacar.",
          ctaText: "VER COLECCIÓN",
          ctaLink: "/productos",
          contentPosition: "bottom-left",
          overlayOpacity: 45,
          textColor: "light",
        },
      ],
    }
  }

  return repository.createLandingSection({
    type: validType,
    position,
    isActive: true,
    config: defaultConfig,
  })
}

export async function deleteLandingSection(id: string) {
  return repository.deleteLandingSection(id)
}
