"use client"

import React, { useState, useRef } from "react"
import { LandingSection, Category } from "@prisma/client"
import LandingBuilderList, { type BuilderGlobals } from "@/components/admin/LandingBuilderList"
import Link from "next/link"

interface VisualBuilderContainerProps {
  initialSections: LandingSection[]
  initialGlobals: BuilderGlobals
  initialBanners: any[]
  categories: Category[]
}

export default function VisualBuilderContainer({ initialSections, initialGlobals, initialBanners, categories }: VisualBuilderContainerProps) {
  const [refreshKey, setRefreshKey] = useState(Date.now())
  const [isClient, setIsClient] = useState(false)

  // Avoid hydration mismatch by only appending the dynamic timestamp on the client
  React.useEffect(() => {
    setIsClient(true)
  }, [])

  const handleRefresh = () => {
    setRefreshKey(Date.now())
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar: Constructor */}
      <div className="w-full md:w-[380px] bg-gray-50 border-r border-gray-200 flex flex-col h-full shadow-xl z-10 flex-shrink-0">
        
        {/* Header de Sidebar */}
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
          <div>
            <Link href="/admin" className="text-xs font-bold text-gray-500 hover:text-gray-800 uppercase tracking-wider mb-1 block">
              &larr; Volver al Admin
            </Link>
            <h1 className="text-xl font-bold font-[var(--font-barlow)] text-[#1C1C1C] leading-tight">
              Constructor Visual
            </h1>
          </div>
          <button 
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            title="Refrescar Previsualización"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          <LandingBuilderList 
            initialSections={initialSections} 
            initialGlobals={initialGlobals}
            initialBanners={initialBanners}
            categories={categories}
            onRefresh={handleRefresh}
          />
        </div>

      </div>

      {/* Main Area: Iframe Preview */}
      <div className="flex-1 bg-gray-200 h-full relative overflow-hidden flex flex-col">
        <div className="h-10 bg-[#1C1C1C] flex items-center justify-center text-xs font-mono text-gray-300 font-medium tracking-widest uppercase">
          Previsualización en Vivo
        </div>
        <div className="flex-1 relative w-full h-full bg-white shadow-2xl">
          <iframe
            src={isClient ? `/?preview=true&t=${refreshKey}` : `/?preview=true`}
            className="w-full h-full border-none"
            title="Live Preview"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  )
}
