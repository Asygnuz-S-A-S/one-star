"use server"

import { requireSuperAdmin } from "@/server/auth/require-admin"
import { updateSiteContent, updateStorefrontSettings } from "@/server/services/site-content.service"
import { updateSiteContentSchema, updateStorefrontSettingsSchema } from "@/server/validators/site-content.validator"
import { faqsFromText, highlightsFromText } from "@/lib/product-faq"
import type { StorePromise, StorePromiseIcon } from "@/lib/store-promises"
import type { ActionResult } from "@/types/admin"


export async function updateSiteContentAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSuperAdmin()

    const rawHighlights = (formData.get("highlights") as string) || ""
    const rawFaqs = (formData.get("faqs") as string) || ""
    const returnWindowDays = Number(formData.get("returnWindowDays") ?? 30)

    const highlights = highlightsFromText(rawHighlights)
    const faqs = faqsFromText(rawFaqs)

    // Promesas editables (returns, payment, support)
    const returnsTitle = ((formData.get("returnsTitle") as string) || "").trim()
    const returnsText = ((formData.get("returnsText") as string) || "").trim()
    const paymentTitle = ((formData.get("paymentTitle") as string) || "").trim()
    const paymentText = ((formData.get("paymentText") as string) || "").trim()
    const supportTitle = ((formData.get("supportTitle") as string) || "").trim()
    const supportText = ((formData.get("supportText") as string) || "").trim()

    const customPromises: StorePromise[] = [
      {
        id: "returns",
        icon: "return" as StorePromiseIcon,
        title: returnsTitle,
        text: returnsText,
      },
      {
        id: "payment",
        icon: "shield" as StorePromiseIcon,
        title: paymentTitle,
        text: paymentText,
      },
      {
        id: "support",
        icon: "chat" as StorePromiseIcon,
        title: supportTitle,
        text: supportText,
      },
    ]

    const validated = updateSiteContentSchema.safeParse({
      highlights,
      faqs,
      promises: customPromises,
      returnWindowDays,
    })

    if (!validated.success) {
      const msg = validated.error.issues[0]?.message ?? "Datos de contenido global inválidos."
      return { success: false, error: msg }
    }

    await updateSiteContent(validated.data)
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar el contenido global.",
    }
  }
}

/** Textos de la ficha de producto (botones y fila de tiendas). Solo Super Admin, como el resto de Contenido. */
export async function updateStorefrontLabelsAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireSuperAdmin()
    const validated = updateStorefrontSettingsSchema.safeParse({
      addToCartLabel: formData.get("addToCartLabel") ?? undefined,
      buyNowLabel: formData.get("buyNowLabel") ?? undefined,
      storeStockText: formData.get("storeStockText") ?? undefined,
    })
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message ?? "Textos inválidos." }
    }
    await updateStorefrontSettings(validated.data)
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudieron guardar los textos." }
  }
}
