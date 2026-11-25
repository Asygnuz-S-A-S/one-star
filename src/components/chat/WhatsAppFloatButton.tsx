"use client"

import { useCartStore } from "@/store"
import { buildWhatsappUrl } from "@/lib/whatsapp"

export const WHATSAPP_FLOAT_MESSAGE = "Hola One Star, quiero más información."

/**
 * Botón flotante de WhatsApp. El número sale de la configuración de la tienda
 * (Admin → Configuración → WhatsApp); sin número válido no se muestra.
 * Con el chat de ventas activo se apila encima de su burbuja.
 */
export default function WhatsAppFloatButton({ number, aboveChat }: { number?: string | null; aboveChat: boolean }) {
  const isCartOpen = useCartStore((s) => s.isOpen)
  const href = buildWhatsappUrl(number, WHATSAPP_FLOAT_MESSAGE)
  if (!href || isCartOpen) return null

  const position = aboveChat
    ? "bottom-[calc(9.75rem+env(safe-area-inset-bottom))] lg:bottom-[5.75rem]"
    : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6"

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      data-testid="whatsapp-float"
      className={`fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] lg:right-6 ${position}`}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M16.04 3C8.86 3 3.03 8.82 3.03 16c0 2.3.6 4.54 1.75 6.52L3 29l6.65-1.74A12.96 12.96 0 0 0 16.04 29C23.22 29 29.05 23.18 29.05 16S23.22 3 16.04 3Zm0 23.62c-1.98 0-3.92-.53-5.62-1.54l-.4-.24-3.95 1.03 1.05-3.85-.26-.4A10.6 10.6 0 0 1 5.4 16c0-5.86 4.77-10.62 10.64-10.62 5.86 0 10.63 4.76 10.63 10.62 0 5.86-4.77 10.62-10.63 10.62Zm5.83-7.95c-.32-.16-1.89-.93-2.18-1.04-.3-.1-.5-.16-.72.16-.21.32-.82 1.04-1 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.21-.18-.32-.02-.49.14-.65.15-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.53-.54-.72-.55h-.62c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66s1.15 3.09 1.31 3.3c.16.21 2.26 3.45 5.47 4.84.77.33 1.36.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.89-.77 2.16-1.52.27-.74.27-1.38.19-1.52-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  )
}
