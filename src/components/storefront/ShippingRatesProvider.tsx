"use client"

import { createContext, useContext, type ReactNode } from "react"
import { DEFAULT_GIFT_CARD_LIMITS } from "@/lib/gift-card"
import { DEFAULT_SHIPPING_RATES, type ShippingRates } from "@/lib/shipping"

interface StorefrontRates {
  shipping: ShippingRates
  giftCardValidityMonths: number
  deliveryMinDays: number
  deliveryMaxDays: number
  expressDeliveryMinDays: number
  expressDeliveryMaxDays: number
  pickupReadyMinDays: number | null
  pickupReadyMaxDays: number | null
}

const ShippingRatesContext = createContext<StorefrontRates>({
  shipping: DEFAULT_SHIPPING_RATES,
  giftCardValidityMonths: DEFAULT_GIFT_CARD_LIMITS.validityMonths,
  deliveryMinDays: 3,
  deliveryMaxDays: 5,
  expressDeliveryMinDays: 1,
  expressDeliveryMaxDays: 2,
  pickupReadyMinDays: null,
  pickupReadyMaxDays: null,
})

export function ShippingRatesProvider({
  rates,
  giftCardValidityMonths = DEFAULT_GIFT_CARD_LIMITS.validityMonths,
  deliveryMinDays = 3,
  deliveryMaxDays = 5,
  expressDeliveryMinDays = 1,
  expressDeliveryMaxDays = 2,
  pickupReadyMinDays = null,
  pickupReadyMaxDays = null,
  children,
}: {
  rates: ShippingRates
  giftCardValidityMonths?: number
  deliveryMinDays?: number
  deliveryMaxDays?: number
  expressDeliveryMinDays?: number
  expressDeliveryMaxDays?: number
  pickupReadyMinDays?: number | null
  pickupReadyMaxDays?: number | null
  children: ReactNode
}) {
  return (
    <ShippingRatesContext.Provider value={{ shipping: rates, giftCardValidityMonths, deliveryMinDays, deliveryMaxDays, expressDeliveryMinDays, expressDeliveryMaxDays, pickupReadyMinDays, pickupReadyMaxDays }}>
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

export function useDeliveryDays(): { min: number; max: number; expressMin: number; expressMax: number; pickupMin: number | null; pickupMax: number | null } {
  const rates = useContext(ShippingRatesContext)
  return {
    min: rates.deliveryMinDays,
    max: rates.deliveryMaxDays,
    expressMin: rates.expressDeliveryMinDays,
    expressMax: rates.expressDeliveryMaxDays,
    pickupMin: rates.pickupReadyMinDays,
    pickupMax: rates.pickupReadyMaxDays,
  }
}
