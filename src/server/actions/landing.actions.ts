import "server-only"

import { revalidatePath } from "next/cache"
import type { Prisma, LandingSectionType } from "@prisma/client"
import { ZodError } from "zod"
import { requireSuperAdmin } from "@/server/auth/require-admin"
import {
  createLandingSection,
  deleteLandingSection,
  setLandingSectionActive,
  updateLandingSectionConfig,
  updateLandingSectionPositions,
} from "@/server/services/landing-section.service"
import { ActiveStateSchema, EntityIdSchema } from "@/server/validators/common.validator"
import {
  LandingPageSchema,
  LandingSectionConfigSchema,
  LandingSectionPositionsSchema,
  LandingSectionTypeSchema,
} from "@/server/validators/landing-section.validator"
import { EditorialContentConfigSchema, isEditorialContentConfig } from "@/server/validators/editorial-content.validator"

const responsiveMediaLabels: Record<string, string> = {
  desktopMedia: "Web / escritorio",
  tabletMedia: "Tablet",
  mobileMedia: "Móvil",
}

/** Keep schema details out of the UI while telling the editor exactly what to fix. */
function landingConfigError(error: unknown): string {
  if (!(error instanceof ZodError)) return "No se pudo guardar la configuración"

  const issue = error.issues[0]
  const path = issue?.path ?? []
  const slideIndex = path[0] === "slides" && typeof path[1] === "number" ? path[1] : undefined
  const mediaField = (slideIndex === undefined ? path[0] : path[2])
  const mediaProperty = (slideIndex === undefined ? path[1] : path[3])
  const mediaLabel = typeof mediaField === "string" ? responsiveMediaLabels[mediaField] : undefined
  const slideSuffix = slideIndex === undefined ? "" : ` del slide ${slideIndex + 1}`
  if (mediaLabel && mediaProperty === "alt") {
    return `El texto alternativo de la imagen ${mediaLabel}${slideSuffix} es obligatorio`
  }
  if (mediaLabel && mediaProperty === "src") {
    return `Selecciona una URL segura para la imagen ${mediaLabel}${slideSuffix}`
  }
  return issue?.message || "Revisa los datos de la configuración"
}

function revalidateLanding() {
  revalidatePath("/")
  revalidatePath("/campanas/[slug]", "page")
  revalidatePath("/admin/landing-builder")
}

export async function updateLandingSectionPositionsAction(updates: { id: string; position: number }[]) {
  "use server"
  try {
    await requireSuperAdmin()
    await updateLandingSectionPositions(LandingSectionPositionsSchema.parse(updates))
    revalidateLanding()
    return { success: true }
  } catch (error) {
    console.error("Error updating landing section positions:", error)
    return { success: false, error: "No se pudo guardar el orden" }
  }
}

export async function toggleLandingSectionActiveAction(id: string, isActive: boolean) {
  "use server"
  try {
    await requireSuperAdmin()
    await setLandingSectionActive(
      EntityIdSchema.parse(id),
      ActiveStateSchema.parse(isActive),
    )
    revalidateLanding()
    return { success: true }
  } catch (error) {
    console.error("Error toggling landing section:", error)
    return { success: false, error: "No se pudo cambiar el estado" }
  }
}

export async function updateLandingSectionConfigAction(id: string, config: Prisma.InputJsonValue) {
  "use server"
  try {
    await requireSuperAdmin()
    const validId = EntityIdSchema.parse(id)
    const validConfig = LandingSectionConfigSchema.parse(config) as Prisma.InputJsonObject
    // Typed presets are strict; pre-existing free-form JSON remains untouched.
    if (isEditorialContentConfig(validConfig)) EditorialContentConfigSchema.parse(validConfig)
    await updateLandingSectionConfig(validId, validConfig)
    revalidateLanding()
    return { success: true }
  } catch (error) {
    console.error("Error updating landing section config:", error)
    return { success: false, error: landingConfigError(error) }
  }
}

export async function createLandingSectionAction(type: LandingSectionType, page: string = "home") {
  "use server"
  try {
    await requireSuperAdmin()
    const validType = LandingSectionTypeSchema.parse(type)
    const newSection = await createLandingSection(validType, LandingPageSchema.parse(page))
    revalidateLanding()
    return { success: true, newSection }
  } catch (error) {
    console.error("Error creating landing section:", error)
    return { success: false, error: "No se pudo crear la sección" }
  }
}

export async function deleteLandingSectionAction(id: string) {
  "use server"
  try {
    await requireSuperAdmin()
    await deleteLandingSection(EntityIdSchema.parse(id))
    revalidateLanding()
    return { success: true }
  } catch (error) {
    console.error("Error deleting landing section:", error)
    return { success: false, error: "No se pudo eliminar la sección" }
  }
}
