"use client"

import { useCallback, useState } from "react"
import Script from "next/script"

import { useCspNonce } from "@/app/providers"

export interface EpaycoCheckoutData {
  orderId: string
  amount: number
  customerEmail: string
  customerName: string
  customerLastName: string
  phone: string
  address: string
  city: string
  department: string
}

/** Handler que devuelve `ePayco.checkout.configure`. */
interface EpaycoHandler {
  open: (data: Record<string, string>) => void
}

interface EpaycoGlobal {
  checkout: {
    configure: (options: { key: string; test: boolean }) => EpaycoHandler
  }
}

declare global {
  interface Window {
    ePayco?: EpaycoGlobal
  }
}

export default function EpaycoButton({
  orderId,
  amount,
  customerEmail,
  customerName,
  customerLastName,
  phone,
  address,
  city,
  department,
}: EpaycoCheckoutData) {
  const nonce = useCspNonce()
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isTest =
    process.env.NEXT_PUBLIC_EPAYCO_TEST === "true" ||
    process.env.NODE_ENV !== "production"

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY
  const reference = orderId.slice(-8).toUpperCase()

  const openCheckout = useCallback(() => {
    setError(null)

    if (!publicKey) {
      setError("Falta configurar la llave pública de ePayco.")
      return
    }
    if (!window.ePayco) {
      setError("No se pudo cargar la pasarela de pagos. Recarga la página e inténtalo de nuevo.")
      return
    }

    try {
      // checkout.js expone únicamente la API programática: hay que configurar
      // el handler y abrir el lightbox a mano. No engancha solo los botones
      // que llevan la clase "epayco-button".
      const handler = window.ePayco.checkout.configure({
        key: publicKey,
        test: isTest,
      })

      handler.open({
        name: `Pedido One Star #${reference}`,
        description: `One Star · Pedido #${reference}`,
        invoice: orderId,
        currency: "cop",
        amount: String(amount),
        tax_base: "0",
        tax: "0",
        country: "co",
        lang: "es",
        external: "false",
        response: `${baseUrl}/checkout/success`,
        confirmation: `${baseUrl}/api/epayco/webhook`,
        email_billing: customerEmail,
        name_billing: `${customerName} ${customerLastName}`.trim(),
        address_billing: address,
        mobilephone_billing: phone,
        city_billing: city,
        state_billing: department,
        country_billing: "CO",
      })
    } catch (err) {
      console.error("[EpaycoButton] No se pudo abrir el checkout:", err)
      setError("No se pudo abrir la pasarela de pagos. Inténtalo de nuevo.")
    }
  }, [
    publicKey, isTest, reference, orderId, amount, baseUrl,
    customerEmail, customerName, customerLastName, address, phone, city, department,
  ])

  return (
    <>
      <Script
        nonce={nonce}
        src="https://checkout.epayco.co/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setIsReady(true)}
        onError={() => setError("No se pudo cargar la pasarela de pagos.")}
      />

      <button
        type="button"
        onClick={openCheckout}
        disabled={!isReady}
        className="w-full bg-[#E31C23] text-white font-barlow font-bold text-base uppercase tracking-wider py-4 rounded-lg hover:bg-[#c21920] transition-colors disabled:opacity-60 disabled:cursor-wait"
      >
        {isReady ? "Pagar con ePayco" : "Cargando pasarela…"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-center font-montserrat text-sm text-[#E31C23]">
          {error}
        </p>
      )}
    </>
  )
}
