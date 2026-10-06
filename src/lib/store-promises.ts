import { STANDARD_SHIPPING_THRESHOLD } from "@/lib/shipping"
import { DELIVERY_BUSINESS_DAYS } from "@/lib/conversion-signals"
import { formatCOP } from "@/lib/shop-utils"

/** Días para cambios y devoluciones: lo que promete la ficha y lo que declara el JSON-LD. */
export const RETURN_WINDOW_DAYS = 30

export type StorePromiseIcon = "truck" | "clock" | "return" | "shield" | "chat"

export interface StorePromise {
  id: string
  icon: StorePromiseIcon
  title: string
  text: string
}

/**
 * Promesas de la tienda que se muestran junto al botón de compra y en "Por qué
 * comprarlo". Todas salen de constantes reales del negocio: nada se inventa.
 */
export function getStorePromises(options: { hasWhatsapp: boolean }): StorePromise[] {
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
      title: `${RETURN_WINDOW_DAYS} días para cambios`,
      text: "Si no te queda o no te convence, lo cambias sin costo.",
    },
    {
      id: "payment",
      icon: "shield",
      title: "Pago 100% seguro",
      text: "Pagas en ePayco, una pasarela certificada: no guardamos tus datos de pago.",
    },
  ]
  if (options.hasWhatsapp) {
    promises.push({
      id: "support",
      icon: "chat",
      title: "Te asesoramos por WhatsApp",
      text: "Resolvemos tallas y dudas antes de que compres.",
    })
  }
  return promises
}
