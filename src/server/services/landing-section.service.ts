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
  return repository.createLandingSection({ type: validType, position, isActive: true })
}

export async function deleteLandingSection(id: string) {
  return repository.deleteLandingSection(id)
}
