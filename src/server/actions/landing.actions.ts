import "server-only"

import { revalidatePath } from "next/cache"
import type { Prisma, LandingSectionType } from "@prisma/client"
import { z, ZodError } from "zod"
import { requireSuperAdmin } from "@/server/auth/require-admin"
import {
  createLandingSection,
  deleteLandingSection,
  setLandingSectionActive,
  publishLandingPage,
  saveLandingPageSettings,
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
  foregroundMedia: "Producto en primer plano",
}

const optionalMediaKeys = ["desktopMedia", "tabletMedia", "mobileMedia", "foregroundMedia"]

/** Una imagen opcional sin link (solo con su texto) equivale a no tener imagen; no debe bloquear el guardado. */
function dropEmptyMedia(value: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...value }
  for (const key of optionalMediaKeys) {
    const media = clean[key] as { src?: unknown } | undefined
    if (media && typeof media === "object" && !String(media.src ?? "").trim()) delete clean[key]
  }
  if (Array.isArray(clean.tiles)) {
    clean.tiles = clean.tiles.map((tile) => {
      if (!tile || typeof tile !== "object") return tile
      const { media, ...rest } = tile as Record<string, unknown> & { media?: { src?: unknown } }
      return media && !String(media.src ?? "").trim() ? rest : tile
    })
  }
  if (Array.isArray(clean.slides)) {
    clean.slides = clean.slides.map((slide) => slide && typeof slide === "object" ? dropEmptyMedia(slide as Record<string, unknown>) : slide)
  }
  return clean
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
  const ctaLabel = mediaField === "primaryCta" ? "del botón principal" : mediaField === "secondaryCta" ? "del segundo botón" : undefined
  if (ctaLabel && mediaProperty === "href") return `Falta el destino ${ctaLabel}${slideSuffix}`
  if (mediaField === "angles") return `Revisa las fotos del giro${slideSuffix}: cada línea debe ser un link`
  return issue?.message || "Revisa los datos de la configuración"
}

function revalidateLandingEditor() {
  revalidatePath("/admin/landing-builder")
}

function revalidateLanding() {
  revalidatePath("/")
  revalidatePath("/[landing]", "page")
  revalidateLandingEditor()
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
    let validConfig = LandingSectionConfigSchema.parse(config) as Prisma.InputJsonObject
    // Typed presets are strict; pre-existing free-form JSON remains untouched.
    if (isEditorialContentConfig(validConfig)) {
      validConfig = dropEmptyMedia(validConfig) as Prisma.InputJsonObject
      EditorialContentConfigSchema.parse(validConfig)
    }
    await updateLandingSectionConfig(validId, validConfig)
    revalidateLandingEditor()
    return { success: true }
  } catch (error) {
    console.error("Error updating landing section config:", error)
    return { success: false, error: landingConfigError(error) }
  }
}

const LandingSettingsSchema = z.object({
  page: LandingPageSchema,
  title: z.string().trim().max(70).transform((v) => v || null),
  description: z.string().trim().max(160).transform((v) => v || null),
  isActive: z.boolean(),
})

/** Activa o desactiva una landing y guarda su título y descripción para Google. Solo Super Admin. */
export async function updateLandingPageSettingsAction(input: { page: string; title: string; description: string; isActive: boolean }) {
  "use server"
  try {
    await requireSuperAdmin()
    const valid = LandingSettingsSchema.parse(input)
    if (valid.page === "home") return { success: false, error: "El inicio no se puede desactivar" }
    await saveLandingPageSettings({ slug: valid.page, title: valid.title, description: valid.description, isActive: valid.isActive })
    revalidateLanding()
    return { success: true }
  } catch (error) {
    console.error("Error updating landing page settings:", error)
    return { success: false, error: error instanceof ZodError ? (error.issues[0]?.message ?? "Revisa los datos") : "No se pudieron guardar los ajustes" }
  }
}

export async function publishLandingPageAction(page: string) {
  "use server"
  try {
    await requireSuperAdmin()
    const count = await publishLandingPage(LandingPageSchema.parse(page))
    revalidateLanding()
    return { success: true as const, count }
  } catch (error) {
    console.error("Error publishing landing page:", error)
    return { success: false, error: "No se pudo publicar" }
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
    const reserved = error instanceof Error && error.message.includes("es una ruta de la tienda")
    return { success: false, error: reserved ? error.message : "No se pudo crear la sección" }
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
