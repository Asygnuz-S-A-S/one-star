import { STANDARD_SHIPPING_THRESHOLD } from "@/lib/shipping"
import { DELIVERY_BUSINESS_DAYS } from "@/lib/conversion-signals"
import { formatCOP } from "@/lib/shop-utils"

/** Días para cambios y devoluciones por defecto: lo que promete la ficha y lo que declara el JSON-LD. */
export const RETURN_WINDOW_DAYS = 30

export type StorePromiseIcon = "truck" | "clock" | "return" | "shield" | "chat"

export interface StorePromise {
  id: string
  icon: StorePromiseIcon
  title: string
  text: string
}

export const DEFAULT_SITE_HIGHLIGHTS: string[] = [
  "100% Originales: Garantía de autenticidad en cada par",
  "Cambios sin costo: Tienes hasta 30 días para solicitar cambio de talla",
  "Envío seguro y rastreado: Cobertura nacional con número de guía",
  "Asesoría personalizada: Te ayudamos con tu talla por WhatsApp",
]

export const DEFAULT_SITE_FAQS: Array<{ q: string; a: string }> = [
  {
    q: "¿Los productos son 100% originales?",
    a: "Sí, todos nuestros productos son completamente originales con garantía directa de marca.",
  },
  {
    q: "¿Cómo es el proceso de cambios y devoluciones?",
    a: "Cuentas con plazo de garantía para solicitar cambio de talla o modelo sin costo adicional.",
  },
  {
    q: "¿Qué medios de pago aceptan?",
    a: "Recibimos tarjetas de crédito, débito, PSE y transferencias mediante la pasarela segura ePayco.",
  },
  {
    q: "¿Cuánto tarda en llegar mi pedido?",
    a: `El tiempo estimado de entrega es de ${DELIVERY_BUSINESS_DAYS.min} a ${DELIVERY_BUSINESS_DAYS.max} días hábiles a nivel nacional.`,
  },
]

/**
 * Promesas de la tienda que se muestran junto al botón de compra y en "Por qué
 * comprarlo".
 *
 * REGLA DE NEGOCIO:
 * Envío y plazo de entrega provienen estrictamente de las constantes reales del
 * negocio (STANDARD_SHIPPING_THRESHOLD y DELIVERY_BUSINESS_DAYS) para evitar
 * promesas falsas que difieran del cobro en el checkout.
 * Devoluciones, pago seguro y soporte admiten personalización respetando returnWindowDays.
 */
export function getStorePromises(options: {
  hasWhatsapp: boolean
  returnWindowDays?: number
  customPromises?: unknown
}): StorePromise[] {
  const returnDays = options.returnWindowDays ?? RETURN_WINDOW_DAYS
  const customMap: Record<string, { title?: string; text?: string; icon?: StorePromiseIcon }> = {}

  if (Array.isArray(options.customPromises)) {
    for (const item of options.customPromises) {
      if (item && typeof item === "object" && typeof item.id === "string") {
        customMap[item.id] = item as { title?: string; text?: string; icon?: StorePromiseIcon }
      }
    }
  } else if (options.customPromises && typeof options.customPromises === "object") {
    Object.assign(customMap, options.customPromises)
  }

  const promises: StorePromise[] = [
    {
      id: "shipping",
      icon: "truck",
      title: "Envío a todo Colombia",
      text: `Gratis en compras desde ${formatCOP(STANDARD_SHIPPING_THRESHOLD)}.`,
    },
    {
      id: "delivery",
      icon: "clock",
      title: `Entrega en ${DELIVERY_BUSINESS_DAYS.min} a ${DELIVERY_BUSINESS_DAYS.max} días hábiles`,
      text: "Recibes número de guía apenas se despacha.",
    },
    {
      id: "returns",
      icon: "return",
      title: customMap.returns?.title?.trim() || `${returnDays} días para cambios`,
      text: customMap.returns?.text?.trim() || "Si no te queda o no te convence, lo cambias sin costo.",
    },
    {
      id: "payment",
      icon: "shield",
      title: customMap.payment?.title?.trim() || "Pago 100% seguro",
      text: customMap.payment?.text?.trim() || "Pagas en ePayco, una pasarela certificada: no guardamos tus datos de pago.",
    },
  ]

  if (options.hasWhatsapp) {
    promises.push({
      id: "support",
      icon: "chat",
      title: customMap.support?.title?.trim() || "Te asesoramos por WhatsApp",
      text: customMap.support?.text?.trim() || "Resolvemos tallas y dudas antes de que compres.",
    })
  }

  return promises
}
