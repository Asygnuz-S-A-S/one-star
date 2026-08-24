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
      {/*
        La tienda está diseñada en modo claro: sus superficies y textos usan
        colores claros fijos. Dejar que el tema siguiera al sistema producía
        campos de formulario oscuros con letra oscura (ilegibles) sobre
        tarjetas blancas. Se fuerza "light" hasta que las pantallas usen los
        tokens de tema de forma consistente.
      */}
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
        nonce={nonce}
      >
        {children}
      </ThemeProvider>
    </CspNonceContext.Provider>
  )
}
