"use client"

import { createContext, useContext, type ReactNode } from "react"
import { DEFAULT_SHIPPING_RATES, type ShippingRates } from "@/lib/shipping"

const ShippingRatesContext = createContext<ShippingRates>(DEFAULT_SHIPPING_RATES)

export function ShippingRatesProvider({
  rates,
  children,
}: {
  rates: ShippingRates
  children: ReactNode
}) {
  return <ShippingRatesContext.Provider value={rates}>{children}</ShippingRatesContext.Provider>
}

export function useShippingRates(): ShippingRates {
  return useContext(ShippingRatesContext)
}
