"use client"

import Script from "next/script"

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
  const isTest =
    process.env.NEXT_PUBLIC_EPAYCO_TEST === "true" ||
    process.env.NODE_ENV !== "production"

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  return (
    <>
      {/*
        El script de ePayco detecta automáticamente los botones con
        class="epayco-button" y les aplica el comportamiento del lightbox.
      */}
      <Script
        src="https://checkout.epayco.co/checkout.js"
        strategy="lazyOnload"
      />

      <button
        className="epayco-button w-full bg-[#E31C23] text-white font-barlow font-bold text-base uppercase tracking-wider py-4 rounded-lg hover:bg-[#c21920] transition-colors"
        data-epayco-key={process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY}
        data-epayco-amount={amount}
        data-epayco-name={`Pedido One Star #${orderId.slice(-8).toUpperCase()}`}
        data-epayco-description={`One Star · Pedido #${orderId.slice(-8).toUpperCase()}`}
        data-epayco-currency="cop"
        data-epayco-country="co"
        data-epayco-test={String(isTest)}
        data-epayco-external="false"
        data-epayco-response={`${baseUrl}/checkout/success`}
        data-epayco-confirmation={`${baseUrl}/api/epayco/webhook`}
        data-epayco-invoice={orderId}
        data-epayco-email-billing={customerEmail}
        data-epayco-first-name-billing={customerName}
        data-epayco-last-name-billing={customerLastName}
        data-epayco-phone-billing={phone}
        data-epayco-address-billing={address}
        data-epayco-city-billing={city}
        data-epayco-state-billing={department}
        data-epayco-country-billing="CO"
      >
        Pagar con ePayco
      </button>
    </>
  )
}
