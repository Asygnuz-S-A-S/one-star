"use server"

import { revalidatePath } from "next/cache"
import { requireSuperAdmin } from "@/server/auth/require-admin"
import { getStorageAdapter } from "@/server/storage/storage.container"
import { parseGiftCardAmounts } from "@/lib/storefront-copy"
import { syncGiftCardCatalog } from "@/server/services/gift-card.service"
import {
  setLegalDocument,
  updateCatalogSource,
  updateMetaPixelSettings,
  updateStoreInfo,
} from "@/server/services/store-settings.service"
import {
  CatalogSourceInputSchema,
  MetaPixelInputSchema,
  StoreInfoInputSchema,
} from "@/server/validators/store-settings.validator"

export interface StoreSettingsActionResult {
  success: boolean
  error?: string
}

function firstIssueMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: Array<{ message: string }> }).issues
    if (issues[0]?.message) return issues[0].message
  }
  return error instanceof Error ? error.message : fallback
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "")
const checkbox = (formData: FormData, key: string) => formData.get(key) === "on"

export async function updateStoreInfoAction(
  formData: FormData,
): Promise<StoreSettingsActionResult> {
  try {
    await requireSuperAdmin()
    const input = StoreInfoInputSchema.parse({
      storeName: text(formData, "storeName"),
      contactEmail: text(formData, "contactEmail").trim(),
      whatsapp: text(formData, "whatsapp"),
      freeShippingThreshold: text(formData, "freeShippingThreshold").trim(),
      standardShippingCost: text(formData, "standardShippingCost").trim(),
      expressShippingCost: text(formData, "expressShippingCost").trim(),
      legalName: text(formData, "legalName"),
      taxId: text(formData, "taxId"),
      legalAddress: text(formData, "legalAddress"),
      contactPhone: text(formData, "contactPhone"),
      hideImagelessProducts: checkbox(formData, "hideImagelessProducts"),
      groupColorsInCatalog: checkbox(formData, "groupColorsInCatalog"),
      newArrivalDays: text(formData, "newArrivalDays").trim(),
      chatEnabled: checkbox(formData, "chatEnabled"),
      chatWelcome: text(formData, "chatWelcome"),
      giftCardMinAmount: text(formData, "giftCardMinAmount").trim(),
      giftCardMaxAmount: text(formData, "giftCardMaxAmount").trim(),
      giftCardValidityMonths: text(formData, "giftCardValidityMonths").trim(),
      clubHeadline: text(formData, "clubHeadline"),
      clubIntro: text(formData, "clubIntro"),
      clubBenefits: text(formData, "clubBenefits"),
      clubWelcomeSubject: text(formData, "clubWelcomeSubject"),
      clubWelcomeBody: text(formData, "clubWelcomeBody"),
      footerLinks: text(formData, "footerLinks"),
      bottomNav: text(formData, "bottomNav"),
      deliveryMinDays: text(formData, "deliveryMinDays").trim(),
      deliveryMaxDays: text(formData, "deliveryMaxDays").trim(),
      expressDeliveryMinDays: text(formData, "expressDeliveryMinDays").trim(),
      expressDeliveryMaxDays: text(formData, "expressDeliveryMaxDays").trim(),
      legalCity: text(formData, "legalCity"),
      commercialRegistry: text(formData, "commercialRegistry"),
      dataProtectionEmail: text(formData, "dataProtectionEmail").trim(),
      giftCardAmounts: text(formData, "giftCardAmounts"),
    })
    await updateStoreInfo(input)
    const amounts = parseGiftCardAmounts(input.giftCardAmounts)
    if (amounts.length > 0) {
      await syncGiftCardCatalog(amounts, {
        minAmount: input.giftCardMinAmount,
        maxAmount: input.giftCardMaxAmount,
      })
    }
    revalidatePath("/admin/configuracion")
    revalidatePath("/", "layout")
    revalidatePath("/productos")
    revalidatePath("/terminos")
    revalidatePath("/privacidad")
    revalidatePath("/cambios")
    revalidatePath("/tarjeta-regalo")
    return { success: true }
  } catch (error: unknown) {
    console.error("[store-settings] updateStoreInfoAction:", error)
    return { success: false, error: firstIssueMessage(error, "No se pudo guardar la configuración") }
  }
}

export async function updateMetaPixelAction(
  formData: FormData,
): Promise<StoreSettingsActionResult> {
  try {
    await requireSuperAdmin()
    const input = MetaPixelInputSchema.parse({
      enabled: checkbox(formData, "enabled"),
      pixelId: text(formData, "pixelId").trim(),
      accessToken: text(formData, "accessToken").trim(),
      clearAccessToken: checkbox(formData, "clearAccessToken"),
      testEventCode: text(formData, "testEventCode").trim(),
    })
    await updateMetaPixelSettings(input)
    revalidatePath("/admin/integraciones")
    // El píxel se inyecta desde el layout raíz: hay que regenerarlo.
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error: unknown) {
    console.error("[store-settings] updateMetaPixelAction:", error)
    return { success: false, error: firstIssueMessage(error, "No se pudo guardar el píxel de Meta") }
  }
}

export async function updateCatalogSourceAction(
  formData: FormData,
): Promise<StoreSettingsActionResult> {
  try {
    await requireSuperAdmin()
    const input = CatalogSourceInputSchema.parse({
      catalogSource: text(formData, "catalogSource").trim(),
    })
    await updateCatalogSource(input.catalogSource)
    revalidatePath("/admin/integraciones")
    revalidatePath("/admin/productos")
    revalidatePath("/admin/productos/importar")
    return { success: true }
  } catch (error: unknown) {
    console.error("[store-settings] updateCatalogSourceAction:", error)
    return { success: false, error: firstIssueMessage(error, "No se pudo actualizar la fuente del catálogo") }
  }
}

const DOCUMENT_KINDS = ["terms", "privacy", "returns"] as const

export async function uploadLegalDocumentAction(formData: FormData): Promise<StoreSettingsActionResult> {
  try {
    await requireSuperAdmin()
    const kind = String(formData.get("kind") ?? "")
    if (!DOCUMENT_KINDS.includes(kind as (typeof DOCUMENT_KINDS)[number])) {
      return { success: false, error: "Documento no reconocido." }
    }
    if (formData.get("clear") === "on") {
      await setLegalDocument(kind as (typeof DOCUMENT_KINDS)[number], null)
      revalidatePath("/terminos")
      revalidatePath("/privacidad")
      revalidatePath("/cambios")
      revalidatePath("/admin/configuracion")
      return { success: true }
    }
    const file = formData.get("file")
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Selecciona un PDF." }
    }
    if (file.type !== "application/pdf") {
      return { success: false, error: "El archivo debe ser un PDF." }
    }
    if (file.size > 15 * 1024 * 1024) {
      return { success: false, error: "El PDF no puede superar 15 MB." }
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = `data:application/pdf;base64,${buffer.toString("base64")}`
    const uploaded = await getStorageAdapter().uploadImage(base64, { folder: "one-star/legal" })
    await setLegalDocument(kind as (typeof DOCUMENT_KINDS)[number], uploaded.url)
    revalidatePath("/terminos")
    revalidatePath("/privacidad")
    revalidatePath("/cambios")
    revalidatePath("/admin/configuracion")
    return { success: true }
  } catch (error: unknown) {
    console.error("[store-settings] uploadLegalDocumentAction:", error)
    return { success: false, error: firstIssueMessage(error, "No se pudo subir el documento") }
  }
}
