"use client"

import { ThemeProvider } from "next-themes"
import { createContext, useContext } from "react"

const CspNonceContext = createContext<string | undefined>(undefined)

export function useCspNonce(): string | undefined {
  return useContext(CspNonceContext)
}

export default function Providers({
  children,
  nonce,
}: {
  children: React.ReactNode
  nonce?: string
}) {
  return (
    <CspNonceContext.Provider value={nonce}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        nonce={nonce}
      >
        {children}
      </ThemeProvider>
    </CspNonceContext.Provider>
  )
}
