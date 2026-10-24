"use client"

import { createContext, useContext, type ReactNode } from "react"
import { DEFAULT_GIFT_CARD_LIMITS } from "@/lib/gift-card"
import { DEFAULT_SHIPPING_RATES, type ShippingRates } from "@/lib/shipping"

interface StorefrontRates {
  shipping: ShippingRates
  giftCardValidityMonths: number
}

const ShippingRatesContext = createContext<StorefrontRates>({
  shipping: DEFAULT_SHIPPING_RATES,
  giftCardValidityMonths: DEFAULT_GIFT_CARD_LIMITS.validityMonths,
})

export function ShippingRatesProvider({
  rates,
  giftCardValidityMonths = DEFAULT_GIFT_CARD_LIMITS.validityMonths,
  children,
}: {
  rates: ShippingRates
  giftCardValidityMonths?: number
  children: ReactNode
}) {
  return (
    <ShippingRatesContext.Provider value={{ shipping: rates, giftCardValidityMonths }}>
      {children}
    </ShippingRatesContext.Provider>
  )
}

export function useShippingRates(): ShippingRates {
  return useContext(ShippingRatesContext).shipping
}

export function useGiftCardValidityMonths(): number {
  return useContext(ShippingRatesContext).giftCardValidityMonths
}
