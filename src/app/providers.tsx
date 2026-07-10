"use client"

import { ThemeProvider } from "next-themes"
import { useEffect, useState } from "react"

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  // Ensure it only renders the theme after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}
