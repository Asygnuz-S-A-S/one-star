"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- los configs JSON heterogéneos de secciones aún no tienen una unión discriminada */

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { motion, AnimatePresence } from "motion/react"
import dynamic from "next/dynamic"
import Image from "next/image"
import BannerForm from "@/components/admin/BannerForm"
import HomeGridClient from "@/components/admin/HomeGridClient"
import LogoManager from "@/components/admin/LogoManager"

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false })
import { LandingSection, LandingSectionType, TopBanner, NavigationItem, StoreLogo, HomeGridBlock } from "@prisma/client"
import type { BannerDTO } from "@/server/services/banner.service"
import type { CategoryDTO } from "@/server/services/category.service"
import { safePublicUrl } from "@/lib/safe-url"
import { reorderTickerMessages, type TickerMessage } from "@/lib/ticker-messages"
import { searchProductsAction } from "@/server/actions/product.actions"
import type { LandingBuilderActions } from "@/types/landing-builder-actions"

export interface BuilderGlobals {
  topBanner: TopBanner | null
  logos: {
    desktop: StoreLogo | null
    mobile: StoreLogo | null
    large: StoreLogo | null
  }
  allLogos: StoreLogo[]
  navigation: NavigationItem[]
  headerConfig: {
    layout: string
    navAlignment: string
    showSearch: boolean
    showCart: boolean
    showUser: boolean
    bgColor: string
    textColor: string
    hasBorderBottom: boolean
    bgOpacity: number
    useBlur: boolean
    margin: string
    padding: string
    borderRadius: string
  }
}

interface LandingBuilderListProps {
  actions: LandingBuilderActions
  initialSections: LandingSection[]
  initialGlobals?: BuilderGlobals
  categories?: CategoryDTO[]
  initialBanners?: BannerDTO[]
  initialGridBlocks?: HomeGridBlock[]
  unavailableAreas?: string[]
  onRefresh?: () => void
}

// Custom confirm dialog state type
interface DeleteConfirm {
  id: string
  label: string
}

const SECTION_LABELS: Record<string, string> = {
  HERO: "Hero Banner (Principal)",
  CATEGORY_GRID: "Grilla de Categorías",
  FEATURED_PRODUCTS: "Productos Destacados",
  BRAND_STRIP: "Carrusel de Marcas",
  NEW_ARRIVALS: "Nuevos Lanzamientos",
  NEWSLETTER: "Suscripción al Newsletter",
  CUSTOM_HTML: "Código Libre HTML/CSS",
  PRODUCT_CAROUSEL: "Carrusel de Productos Personalizado",
}

export default function LandingBuilderList({ actions, initialSections, initialGlobals, initialBanners, initialGridBlocks = [], categories, unavailableAreas = [], onRefresh }: LandingBuilderListProps) {
  const {
    createLandingSectionAction,
    deleteBanner,
    deleteLandingSectionAction,
    toggleBannerActive,
    toggleLandingSectionActiveAction,
    updateHeaderConfigAction,
    updateLandingSectionConfigAction,
    updateLandingSectionPositionsAction,
    updateTopBannerAction,
    createNavigationItemAction,
    deleteNavigationItemAction,
    toggleNavigationItemActiveAction,
    updateNavigationItemAction,
    updateNavigationPositionsAction,
  } = actions
  const router = useRouter()
  const [sections, setSections] = useState(initialSections)
  const [isSaving, setIsSaving] = useState(false)
  const sectionMutationLockRef = React.useRef(false)

  const [showBannerForm, setShowBannerForm] = useState(false)
  const [editingBanner, setEditingBanner] = useState<BannerDTO | null>(null)
  const banners = initialBanners || []
  const isUnavailable = (area: string) => unavailableAreas.includes(area)

  const closeBannerForm = () => {
    setShowBannerForm(false)
    setEditingBanner(null)
    router.refresh()
    triggerRefresh()
  }

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este banner?")) return
    if (isSaving) return
    setIsSaving(true)
    try {
      const result = await deleteBanner(id)
      if (!result.success) {
        alert(result.error || "Error al eliminar el banner")
        return
      }
      router.refresh()
      triggerRefresh()
    } catch {
      alert("Error inesperado al eliminar el banner")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleBanner = async (id: string, current: boolean) => {
    setIsSaving(true)
    try {
      const result = await toggleBannerActive(id, current)
      if (result.success) {
        router.refresh()
        triggerRefresh()
      } else {
        alert(result.error || "No se pudo cambiar el estado del banner")
      }
    } catch {
      alert("No se pudo cambiar el estado del banner")
    } finally {
      setIsSaving(false)
    }
  }
  
  // Section editing
  const [editingSection, setEditingSection] = useState<LandingSection | null>(null)
  
  // Global editing
  type GlobalEditType = "TOP_BANNER" | "BANNERS" | "LOGOS" | "NAVIGATION" | "HOME_GRID" | null
  const [editingGlobal, setEditingGlobal] = useState<GlobalEditType>(null)
  const [globalBannerState, setGlobalBannerState] = useState<Partial<TopBanner>>(() => {
    const banner = initialGlobals?.topBanner
    const messages = Array.isArray(banner?.messages) && banner.messages.length > 0
      ? banner.messages
      : banner?.text
        ? [{ text: banner.text, url: banner.btnUrl || "" }]
        : []
    return banner
      ? { ...banner, messages }
      : { text: "", btnText: "", btnUrl: "", messages: [], bgColor: "#000000", textColor: "#FFFFFF", isActive: false }
  })
  const tickerMessages = Array.isArray(globalBannerState.messages)
    ? globalBannerState.messages as unknown as TickerMessage[]
    : []

  const setTickerMessages = (messages: TickerMessage[]) => {
    setGlobalBannerState(previous => ({
      ...previous,
      messages: messages as any,
      text: messages[0]?.text || "",
    }))
  }

  const moveTickerMessage = (index: number, direction: -1 | 1) => {
    setTickerMessages(reorderTickerMessages(tickerMessages, index, direction))
  }

  // Navigation State
  const [navItems, setNavItems] = useState<NavigationItem[]>(initialGlobals?.navigation || [])
  const [navDrafts, setNavDrafts] = useState<Record<string, { label: string; href: string }>>(() =>
    Object.fromEntries((initialGlobals?.navigation || []).map(item => [item.id, { label: item.label, href: item.href }]))
  )
  const [newNavLabel, setNewNavLabel] = useState("")
  const [newNavUrl, setNewNavUrl] = useState("")
  const [isNavSaving, setIsNavSaving] = useState(false)
  const [headerConfig, setHeaderConfig] = useState(initialGlobals?.headerConfig || {
    layout: "logo-left-nav-center",
    navAlignment: "left",
    showSearch: true,
    showCart: true,
    showUser: true,
    bgColor: "#FFFFFF",
    textColor: "#1C1C1C",
    hasBorderBottom: true,
    bgOpacity: 100,
    useBlur: false,
    margin: "0px",
    padding: "0px",
    borderRadius: "0px"
  })

  // Custom Product Carousel State
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [productSearchResults, setProductSearchResults] = useState<any[]>([])
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null)
  
  // Config form state
  const [configInput, setConfigInput] = useState<Record<string, any>>({})

  // Add block state
  const [isAddingBlock, setIsAddingBlock] = useState(false)

  // Delay refresh to let revalidatePath propagate before iframe reloads
  const triggerRefresh = () => {
    setTimeout(() => {
      if (onRefresh) onRefresh()
    }, 500)
  }

  const handleAddBlock = async (type: LandingSectionType) => {
    setIsSaving(true)
    setIsAddingBlock(false)
    const res = await createLandingSectionAction(type)
    if (res.success && res.newSection) {
      setSections([...sections, res.newSection])
    }
    setIsSaving(false)
    triggerRefresh()
  }

  const handleDeleteBlock = async (id: string) => {
    if (isSaving || sectionMutationLockRef.current) return
    sectionMutationLockRef.current = true
    const previousSections = sections
    const previousEditingSection = editingSection

    setDeleteConfirm(null)
    setIsSaving(true)
    setSections(previous => previous.filter(section => section.id !== id))
    setEditingSection(null)
    try {
      const result = await deleteLandingSectionAction(id)
      if (!result.success) {
        setSections(previousSections)
        setEditingSection(previousEditingSection)
        alert(result.error || "No se pudo eliminar la sección")
        return
      }
      triggerRefresh()
    } catch {
      setSections(previousSections)
      setEditingSection(previousEditingSection)
      alert("No se pudo eliminar la sección")
    } finally {
      sectionMutationLockRef.current = false
      setIsSaving(false)
    }
  }

  const onDragEnd = async (result: DropResult) => {
    if (isSaving || sectionMutationLockRef.current) return
    if (!result.destination) return
    const { source, destination } = result
    if (source.index === destination.index) return

    const prevSections = sections
    const newSections = Array.from(sections)
    const [moved] = newSections.splice(source.index, 1)
    newSections.splice(destination.index, 0, moved)

    const updatedSections = newSections.map((sec, i) => ({
      ...sec,
      position: i + 1,
    }))

    sectionMutationLockRef.current = true
    setSections(updatedSections)
    setIsSaving(true)

    try {
      const res = await updateLandingSectionPositionsAction(
        updatedSections.map(s => ({ id: s.id, position: s.position }))
      )

      if (!res?.success) {
        setSections(prevSections)
        alert("No se pudo guardar el nuevo orden: " + (res?.error ?? "desconocido"))
        return
      }
      triggerRefresh()
    } catch {
      setSections(prevSections)
      alert("No se pudo guardar el nuevo orden")
    } finally {
      sectionMutationLockRef.current = false
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    if (isSaving || sectionMutationLockRef.current) return
    sectionMutationLockRef.current = true
    const newActive = !currentActive
    setIsSaving(true)
    setSections(previous => previous.map(section =>
      section.id === id ? { ...section, isActive: newActive } : section
    ))

    try {
      const result = await toggleLandingSectionActiveAction(id, newActive)
      if (!result.success) {
        setSections(previous => previous.map(section =>
          section.id === id ? { ...section, isActive: currentActive } : section
        ))
        alert(result.error || "No se pudo cambiar el estado de la sección")
        return
      }
      triggerRefresh()
    } catch {
      setSections(previous => previous.map(section =>
        section.id === id ? { ...section, isActive: currentActive } : section
      ))
      alert("No se pudo cambiar el estado de la sección")
    } finally {
      sectionMutationLockRef.current = false
      setIsSaving(false)
    }
  }

  const startEditingConfig = (section: LandingSection) => {
    setEditingSection(section)
    const config = typeof section.config === 'object' && section.config !== null 
      ? section.config as Record<string, any> 
      : {}
    setConfigInput(config)
  }

  // Save global banner
  const handleSaveGlobalBanner = async () => {
    setIsSaving(true)
    try {
      const result = await updateTopBannerAction({
        text: globalBannerState.text || "",
        btnText: globalBannerState.btnText || "",
        btnUrl: globalBannerState.btnUrl || "",
        messages: (globalBannerState.messages as { text: string; url?: string }[] | null) ?? [],
        bgColor: globalBannerState.bgColor || "#000000",
        textColor: globalBannerState.textColor || "#FFFFFF",
        isActive: globalBannerState.isActive ?? false
      })
      if (!result.success) {
        alert("Error: " + result.error)
        setIsSaving(false)
        return
      }
      if (onRefresh) onRefresh()
      setEditingGlobal(null)
    } catch (e) {
      console.error(e)
      alert("Error al guardar el banner superior")
    }
    setIsSaving(false)
  }

  const onNavDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const { source, destination } = result
    if (source.index === destination.index) return

    const previousItems = navItems
    setIsNavSaving(true)
    const newItems = Array.from(navItems)
    const [moved] = newItems.splice(source.index, 1)
    newItems.splice(destination.index, 0, moved)

    const updatedItems = newItems.map((item, i) => ({ ...item, position: i + 1 }))
    setNavItems(updatedItems)
    
    try {
      const response = await updateNavigationPositionsAction(updatedItems.map(item => ({ id: item.id, position: item.position })))
      if (!response.success) {
        setNavItems(previousItems)
        alert(response.error || "No se pudo guardar el orden")
      } else if (onRefresh) {
        onRefresh()
      }
    } catch {
      setNavItems(previousItems)
      alert("No se pudo guardar el orden")
    } finally {
      setIsNavSaving(false)
    }
  }

  const deleteNavItem = async (id: string) => {
    if (!confirm("¿Eliminar enlace?")) return
    setIsNavSaving(true)
    try {
      const response = await deleteNavigationItemAction(id)
      if (response.success) {
        setNavItems(prev => prev.filter(i => i.id !== id))
        setNavDrafts(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        if (onRefresh) onRefresh()
      } else {
        alert(response.error || "No se pudo eliminar el enlace")
      }
    } catch {
      alert("No se pudo eliminar el enlace")
    } finally {
      setIsNavSaving(false)
    }
  }

  const addNavItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNavLabel || !newNavUrl) return
    setIsNavSaving(true)
    try {
      const res = await createNavigationItemAction(newNavLabel, newNavUrl, false)
      if (res.success && res.data) {
        const item = res.data as NavigationItem
        setNavItems([...navItems, item])
        setNavDrafts(prev => ({ ...prev, [item.id]: { label: item.label, href: item.href } }))
        setNewNavLabel("")
        setNewNavUrl("")
        if (onRefresh) onRefresh()
      } else {
        alert(res.error || "No se pudo agregar el enlace")
      }
    } catch {
      alert("No se pudo agregar el enlace")
    } finally {
      setIsNavSaving(false)
    }
  }

  const handleNavItemChange = async (id: string, updates: { label?: string; href?: string }) => {
    setIsNavSaving(true)
    const item = navItems.find(i => i.id === id)
    if (!item) {
      setIsNavSaving(false)
      return
    }
    const label = updates.label !== undefined ? updates.label.trim() : item.label
    const href = updates.href !== undefined ? updates.href.trim() : item.href
    if (!label || !href) {
      alert("El nombre y la URL son obligatorios")
      setNavDrafts(prev => ({ ...prev, [id]: { label: item.label, href: item.href } }))
      setIsNavSaving(false)
      return
    }
    setNavItems(prev => prev.map(i => i.id === id ? { ...i, label, href } : i))
    setNavDrafts(prev => ({ ...prev, [id]: { label, href } }))
    try {
      const result = await updateNavigationItemAction(id, label, href, item.isSale)
      if (!result.success) {
        setNavItems(prev => prev.map(i => i.id === id ? item : i))
        setNavDrafts(prev => ({ ...prev, [id]: { label: item.label, href: item.href } }))
        alert(result.error || "No se pudo actualizar el enlace")
      } else if (onRefresh) {
        onRefresh()
      }
    } catch {
      setNavItems(prev => prev.map(i => i.id === id ? item : i))
      setNavDrafts(prev => ({ ...prev, [id]: { label: item.label, href: item.href } }))
      alert("No se pudo actualizar el enlace")
    } finally {
      setIsNavSaving(false)
    }
  }

  const toggleNavActive = async (id: string, current: boolean) => {
    setIsNavSaving(true)
    setNavItems(prev => prev.map(i => i.id === id ? { ...i, isActive: !current } : i))
    try {
      const result = await toggleNavigationItemActiveAction(id, !current)
      if (!result.success) {
        setNavItems(prev => prev.map(i => i.id === id ? { ...i, isActive: current } : i))
        alert(result.error || "No se pudo cambiar el estado")
      } else if (onRefresh) {
        onRefresh()
      }
    } catch {
      setNavItems(prev => prev.map(i => i.id === id ? { ...i, isActive: current } : i))
      alert("No se pudo cambiar el estado")
    } finally {
      setIsNavSaving(false)
    }
  }

  const toggleNavSale = async (item: NavigationItem) => {
    setIsNavSaving(true)
    setNavItems(prev => prev.map(i => i.id === item.id ? { ...i, isSale: !item.isSale } : i))
    try {
      const result = await updateNavigationItemAction(item.id, item.label, item.href, !item.isSale)
      if (!result.success) {
        setNavItems(prev => prev.map(i => i.id === item.id ? item : i))
        alert(result.error || "No se pudo cambiar el estilo SALE")
      } else if (onRefresh) {
        onRefresh()
      }
    } catch {
      setNavItems(prev => prev.map(i => i.id === item.id ? item : i))
      alert("No se pudo cambiar el estilo SALE")
    } finally {
      setIsNavSaving(false)
    }
  }

  const handleSaveHeaderConfig = async () => {
    setIsNavSaving(true)
    try {
      const res = await updateHeaderConfigAction(headerConfig)
      if (res?.error) {
        alert("Error: " + res.error)
      } else {
        if (onRefresh) onRefresh()
      }
    } catch (error: unknown) {
      alert("Error inesperado al guardar el header: " + (error instanceof Error ? error.message : "desconocido"))
    }
    setIsNavSaving(false)
  }

  const saveConfig = async () => {
    if (!editingSection) return
    setIsSaving(true)

    // Snapshot para poder revertir si el guardado falla
    const prevSections = sections
    setSections(sections.map(s =>
      s.id === editingSection.id
        ? { ...s, config: configInput as any }
        : s
    ))

    const res = await updateLandingSectionConfigAction(editingSection.id, configInput)
    setIsSaving(false)

    if (!res?.success) {
      // Revierte el cambio optimista y mantiene el modal abierto con el error
      setSections(prevSections)
      alert("Error al guardar la configuración: " + (res?.error ?? "desconocido"))
      return
    }

    setEditingSection(null)
    triggerRefresh()
  }
  const renderModals = () => (
    <AnimatePresence>
      {/* Banner Form Modal */}
      {(showBannerForm || editingBanner) && (
        <motion.div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto relative"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-[var(--font-barlow)] text-lg font-bold text-[#1C1C1C]">
                {editingBanner ? "Editar Slide" : "Nuevo Slide"}
              </h2>
              <button onClick={closeBannerForm} className="text-gray-400 hover:text-gray-800 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <BannerForm actions={actions} initial={editingBanner ?? undefined} onClose={closeBannerForm} />
          </motion.div>
        </motion.div>
      )}

      {/* Custom delete confirmation dialog */}
      {deleteConfirm && (
        <motion.div 
          className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full relative border border-gray-100"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <h3 className="font-bold text-[#1C1C1C] text-lg mb-2">Eliminar bloque</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              ¿Seguro que deseas eliminar <strong>{deleteConfirm.label}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteBlock(deleteConfirm.id)}
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isSaving ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (editingGlobal === "TOP_BANNER") {
    return (
      <div className="flex flex-col h-full bg-white relative">
        <div className="p-4 overflow-y-auto flex-1">
          <h3 className="font-bold text-lg mb-4 font-[var(--font-barlow)] uppercase tracking-wide">
            Top Banner Promocional
          </h3>
          
          <div className="flex flex-col gap-4">
            {/* Lista de Mensajes del Ticker */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Mensajes Promocionales (Ticker)</label>
              <button
                type="button"
                onClick={() => {
                  setTickerMessages([...tickerMessages, { text: "", url: "" }])
                }}
                className="text-xs bg-[#1C1C1C] text-white px-2 py-1 rounded"
              >
                + Añadir
              </button>
            </div>
            
            <div className="space-y-3">
              {tickerMessages.map((msg, idx) => (
                <div key={idx} className="flex flex-col gap-2 rounded border border-gray-200 bg-gray-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Mensaje {idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveTickerMessage(idx, -1)}
                        disabled={idx === 0}
                        aria-label={`Subir mensaje ${idx + 1}`}
                        className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTickerMessage(idx, 1)}
                        disabled={idx === tickerMessages.length - 1}
                        aria-label={`Bajar mensaje ${idx + 1}`}
                        className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setTickerMessages(tickerMessages.filter((_, messageIndex) => messageIndex !== idx))}
                        aria-label={`Eliminar mensaje ${idx + 1}`}
                        className="flex h-6 w-6 items-center justify-center rounded bg-red-500 text-xs font-bold text-white hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={msg.text || ""}
                    onChange={(e) => {
                      const messages = [...tickerMessages]
                      messages[idx] = { ...messages[idx], text: e.target.value }
                      setTickerMessages(messages)
                    }}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                    placeholder="Ej: 20% OFF en toda la tienda"
                  />
                  <input
                    type="text"
                    value={msg.url || ""}
                    onChange={(e) => {
                      const messages = [...tickerMessages]
                      messages[idx] = { ...messages[idx], url: e.target.value }
                      setTickerMessages(messages)
                    }}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                    placeholder="URL opcional (ej: /coleccion)"
                  />
                </div>
              ))}
              {tickerMessages.length === 0 && (
                <p className="text-xs text-gray-400 italic">No hay mensajes. Añade al menos uno.</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                Etiqueta global del CTA
              </label>
              <input
                type="text"
                value={globalBannerState.btnText || ""}
                onChange={(e) => setGlobalBannerState({ ...globalBannerState, btnText: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                placeholder="Ver oferta"
              />
              <p className="text-[10px] text-gray-500 mt-1">Se muestra junto a los mensajes que tienen URL.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                URL del CTA anterior (compatibilidad)
              </label>
              <input
                type="text"
                value={globalBannerState.btnUrl || ""}
                onChange={(e) => setGlobalBannerState({ ...globalBannerState, btnUrl: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                placeholder="/sale"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Fondo</label>
              <input
                type="color"
                value={globalBannerState.bgColor || "#000000"}
                onChange={(e) => setGlobalBannerState({...globalBannerState, bgColor: e.target.value})}
                className="w-full h-10 border border-gray-300 rounded cursor-pointer p-1"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Texto</label>
              <input
                type="color"
                value={globalBannerState.textColor || "#FFFFFF"}
                onChange={(e) => setGlobalBannerState({...globalBannerState, textColor: e.target.value})}
                className="w-full h-10 border border-gray-300 rounded cursor-pointer p-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 bg-gray-50 p-3 rounded border border-gray-200">
            <input
              type="checkbox"
              id="topBannerActive"
              checked={globalBannerState.isActive || false}
              onChange={(e) => setGlobalBannerState({...globalBannerState, isActive: e.target.checked})}
              className="w-4 h-4 text-[#1C1C1C] focus:ring-[#1C1C1C]"
            />
            <label htmlFor="topBannerActive" className="text-sm font-bold text-gray-700 cursor-pointer">
              Banner Activo (Visible)
            </label>
          </div>
        </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex gap-2 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button
            onClick={handleSaveGlobalBanner}
            disabled={isSaving}
            className="flex-1 bg-[#1C1C1C] text-white py-3 rounded text-sm font-bold uppercase hover:bg-gray-800 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
          <button
            onClick={() => setEditingGlobal(null)}
            disabled={isSaving}
            className="px-4 py-3 bg-gray-200 text-gray-800 rounded text-sm font-bold uppercase hover:bg-gray-300 disabled:opacity-50"
          >
            Atrás
          </button>
        </div>
      </div>
    )
  }

  if (editingGlobal === "BANNERS") {
    return (
      <div className="flex h-full flex-col bg-white">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-[var(--font-barlow)] text-lg font-bold uppercase tracking-wide">
                Banners del Hero
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Administra los slides aunque la página no tenga actualmente un bloque HERO.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBannerForm(true)}
              disabled={isSaving || isUnavailable("banners")}
              className="rounded bg-[#1C1C1C] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Añadir banner
            </button>
          </div>

          {isUnavailable("banners") ? (
            <p className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              No se pudieron cargar los banners. Recarga antes de editar para evitar sobrescribir información.
            </p>
          ) : (
            <div className="space-y-3">
              {banners.map((banner) => (
                <div key={banner.id} className="flex items-center gap-3 rounded border border-gray-200 bg-white p-3">
                  <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                    {banner.mediaType === "video" ? (
                      <video src={safePublicUrl(banner.imageUrl, "")} className="h-full w-full object-cover" muted />
                    ) : (
                      <Image
                        src={safePublicUrl(banner.imageUrl, "/placeholder-product.svg")}
                        alt={banner.title || "Banner"}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-gray-800">{banner.title}</p>
                    <p className="text-[10px] text-gray-500">
                      {banner.isActive ? "Activo" : "Inactivo"} • Posición {banner.position}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleBanner(banner.id, banner.isActive)}
                      disabled={isSaving}
                      className={`px-2 text-xs font-bold hover:underline disabled:opacity-40 ${banner.isActive ? "text-amber-700" : "text-green-700"}`}
                    >
                      {banner.isActive ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBanner(banner)}
                      disabled={isSaving}
                      className="px-2 text-xs font-bold text-[#E31C23] hover:underline disabled:opacity-40"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(banner.id)}
                      disabled={isSaving}
                      className="px-2 text-xs font-bold text-gray-500 hover:text-red-600 hover:underline disabled:opacity-40"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
              {banners.length === 0 && (
                <p className="rounded border border-dashed border-gray-300 py-6 text-center text-xs text-gray-500">
                  No hay banners. Puedes crear el primero desde aquí.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="border-t bg-gray-50 p-4">
          <button
            onClick={() => setEditingGlobal(null)}
            disabled={isSaving}
            className="w-full rounded bg-gray-200 px-4 py-3 text-sm font-bold uppercase text-gray-800 hover:bg-gray-300 disabled:opacity-50"
          >
            Atrás
          </button>
        </div>
        {renderModals()}
      </div>
    )
  }

  if (editingGlobal === "LOGOS") {
    return (
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        <div className="p-4">
          <h3 className="font-bold text-lg mb-2 font-[var(--font-barlow)] uppercase tracking-wide">
            Logos (Header / Footer)
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Sube, recorta y conserva varias versiones. Puedes definir el logo principal y su tema para móvil, escritorio y footer.
          </p>
          <LogoManager
            actions={actions}
            initialLogos={initialGlobals?.allLogos || []}
            onChange={() => {
              router.refresh()
              triggerRefresh()
            }}
          />
        </div>

        <div className="p-4 pt-0">
          <button
            onClick={() => setEditingGlobal(null)}
            className="w-full px-4 py-3 bg-gray-100 text-gray-800 rounded text-sm font-bold uppercase hover:bg-gray-200"
          >
            Atrás
          </button>
        </div>
      </div>
    )
  }

  if (editingGlobal === "HOME_GRID") {
    return (
      <div className="flex flex-col h-full bg-white overflow-y-auto p-4">
        <HomeGridClient
          actions={actions}
          blocks={initialGridBlocks}
          onRefresh={() => {
            router.refresh()
            triggerRefresh()
          }}
        />
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => setEditingGlobal(null)}
            className="w-full px-4 py-3 bg-gray-100 text-gray-800 rounded text-sm font-bold uppercase hover:bg-gray-200"
          >
            Atrás
          </button>
        </div>
      </div>
    )
  }

  if (editingGlobal === "NAVIGATION") {
    return (
      <div className="flex flex-col h-full bg-white p-4 overflow-y-auto">
        <h3 className="font-bold text-lg mb-4 font-[var(--font-barlow)] uppercase tracking-wide">
          Configuración y Navegación
        </h3>
        
        <div className="flex-1 flex flex-col gap-6">
          {/* Header Global Config */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 pb-2 border-b border-gray-200">Diseño Global del Header</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Disposición (Layout)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const updated = { ...headerConfig, layout: "logo-left-nav-center" }
                      setHeaderConfig(updated)
                    }}
                    className={`p-2 text-xs font-bold rounded border transition-colors ${
                      headerConfig.layout === "logo-left-nav-center"
                        ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                    }`}
                  >
                    Clásico (Logo Izq)
                  </button>
                  <button
                    onClick={() => {
                      const updated = { ...headerConfig, layout: "logo-center-nav-left" }
                      setHeaderConfig(updated)
                    }}
                    className={`p-2 text-xs font-bold rounded border transition-colors ${
                      headerConfig.layout === "logo-center-nav-left"
                        ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                    }`}
                  >
                    Centrado (Logo Centro)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Alineación del Menú</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setHeaderConfig({ ...headerConfig, navAlignment: "left" })}
                    className={`p-2 text-xs font-bold rounded border transition-colors ${
                      headerConfig.navAlignment === "left"
                        ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                    }`}
                  >
                    Izquierda
                  </button>
                  <button
                    onClick={() => setHeaderConfig({ ...headerConfig, navAlignment: "center" })}
                    className={`p-2 text-xs font-bold rounded border transition-colors ${
                      headerConfig.navAlignment === "center"
                        ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                    }`}
                  >
                    Centro
                  </button>
                  <button
                    onClick={() => setHeaderConfig({ ...headerConfig, navAlignment: "right" })}
                    className={`p-2 text-xs font-bold rounded border transition-colors ${
                      headerConfig.navAlignment === "right"
                        ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                    }`}
                  >
                    Derecha
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Botones Visibles</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={headerConfig.showSearch}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, showSearch: e.target.checked })}
                      className="rounded border-gray-300 text-[#1C1C1C] focus:ring-[#1C1C1C]"
                    />
                    Buscador
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={headerConfig.showCart}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, showCart: e.target.checked })}
                      className="rounded border-gray-300 text-[#1C1C1C] focus:ring-[#1C1C1C]"
                    />
                    Carrito
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={headerConfig.showUser}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, showUser: e.target.checked })}
                      className="rounded border-gray-300 text-[#1C1C1C] focus:ring-[#1C1C1C]"
                    />
                    Usuario
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Colores del Header</label>
                <div className="flex gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Fondo</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={headerConfig.bgColor || "#FFFFFF"}
                        onChange={(e) => setHeaderConfig({ ...headerConfig, bgColor: e.target.value })}
                        className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={headerConfig.bgColor || "#FFFFFF"}
                        onChange={(e) => setHeaderConfig({ ...headerConfig, bgColor: e.target.value })}
                        className="text-xs border-gray-300 rounded p-1 w-20 uppercase"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Texto e Iconos</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={headerConfig.textColor || "#1C1C1C"}
                        onChange={(e) => setHeaderConfig({ ...headerConfig, textColor: e.target.value })}
                        className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={headerConfig.textColor || "#1C1C1C"}
                        onChange={(e) => setHeaderConfig({ ...headerConfig, textColor: e.target.value })}
                        className="text-xs border-gray-300 rounded p-1 w-20 uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Ajustes Avanzados de Diseño</label>
                <div className="flex flex-col gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={headerConfig.hasBorderBottom}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, hasBorderBottom: e.target.checked })}
                      className="rounded border-gray-300 text-[#1C1C1C] focus:ring-[#1C1C1C]"
                    />
                    Borde Inferior (Línea Divisoria)
                  </label>
                  
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Transparencia del Fondo ({headerConfig.bgOpacity}%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={headerConfig.bgOpacity}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, bgOpacity: parseInt(e.target.value) })}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={headerConfig.useBlur}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, useBlur: e.target.checked })}
                      className="rounded border-gray-300 text-[#1C1C1C] focus:ring-[#1C1C1C]"
                    />
                    Efecto Difuminado (Blur)
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Margen (ej. 10px)</label>
                      <input
                        type="text"
                        value={headerConfig.margin}
                        onChange={(e) => setHeaderConfig({ ...headerConfig, margin: e.target.value })}
                        className="text-xs border-gray-300 rounded p-2 w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Padding Interno</label>
                      <input
                        type="text"
                        value={headerConfig.padding}
                        onChange={(e) => setHeaderConfig({ ...headerConfig, padding: e.target.value })}
                        className="text-xs border-gray-300 rounded p-2 w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Bordes Redondeados (ej. 12px, 0px)</label>
                    <input
                      type="text"
                      value={headerConfig.borderRadius}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, borderRadius: e.target.value })}
                      className="text-xs border-gray-300 rounded p-2 w-full"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveHeaderConfig}
                disabled={isNavSaving}
                className="w-full bg-[#1C1C1C] text-white py-2 rounded text-xs font-bold uppercase hover:bg-gray-800 disabled:opacity-50 mt-2"
              >
                {isNavSaving ? "Guardando..." : "Guardar Diseño"}
              </button>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Links List */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase mb-3">Enlaces de Navegación</h4>
            <DragDropContext onDragEnd={onNavDragEnd}>
            <Droppable droppableId="navigation-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-3">
                  {navItems.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={isNavSaving}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex flex-col gap-2 bg-gray-50 border p-2 rounded transition-colors ${
                            snapshot.isDragging ? "border-[#1C1C1C] shadow-lg z-10" : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              {...provided.dragHandleProps} 
                              className="text-gray-400 hover:text-gray-800 cursor-grab active:cursor-grabbing p-1"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <input 
                                className="text-sm font-bold text-gray-800 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[#1C1C1C] focus:border-dashed w-full transition-colors"
                                value={navDrafts[item.id]?.label ?? item.label}
                                onChange={(e) => setNavDrafts(prev => ({
                                  ...prev,
                                  [item.id]: { label: e.target.value, href: prev[item.id]?.href ?? item.href },
                                }))}
                                onBlur={(e) => {
                                  if (e.target.value !== item.label) {
                                    handleNavItemChange(item.id, { label: e.target.value })
                                  }
                                }}
                                disabled={isNavSaving}
                                title="Haz clic para editar el nombre"
                              />
                              <input
                                className="text-xs text-gray-500 font-mono bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[#1C1C1C] focus:border-dashed w-full transition-colors"
                                value={navDrafts[item.id]?.href ?? item.href}
                                onChange={(e) => setNavDrafts(prev => ({
                                  ...prev,
                                  [item.id]: { label: prev[item.id]?.label ?? item.label, href: e.target.value },
                                }))}
                                onBlur={(e) => {
                                  if (e.target.value !== item.href) {
                                    handleNavItemChange(item.id, { href: e.target.value })
                                  }
                                }}
                                disabled={isNavSaving}
                                title="Haz clic para editar la URL"
                              />
                            </div>
                            <button 
                              onClick={() => deleteNavItem(item.id)}
                              disabled={isNavSaving}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Eliminar"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex gap-4 px-1 pt-1 border-t border-gray-200 mt-1">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                              <button
                                type="button"
                                onClick={() => toggleNavActive(item.id, item.isActive)}
                                disabled={isNavSaving}
                                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                  item.isActive ? "bg-[#1C1C1C]" : "bg-gray-300"
                                }`}
                              >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                  item.isActive ? "translate-x-3.5" : "translate-x-0.5"
                                }`} />
                              </button>
                              Activo
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                              <button
                                type="button"
                                onClick={() => toggleNavSale(item)}
                                disabled={isNavSaving}
                                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                  item.isSale ? "bg-[#E31C23]" : "bg-gray-300"
                                }`}
                              >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                  item.isSale ? "translate-x-3.5" : "translate-x-0.5"
                                }`} />
                              </button>
                              ¿Es Oferta?
                            </label>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
          <form onSubmit={addNavItem} className="mt-4 p-3 bg-gray-100 rounded border border-gray-300">
            <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Añadir Enlace</h4>
            <input 
              required
              placeholder="Nombre (Ej: Ofertas)"
              value={newNavLabel}
              onChange={e => setNewNavLabel(e.target.value)}
              className="w-full text-sm p-2 mb-2 rounded border border-gray-300"
            />
            <input
              required
              type="text"
              list="navigation-route-suggestions"
              value={newNavUrl}
              onChange={e => setNewNavUrl(e.target.value)}
              className="w-full text-sm p-2 mb-2 rounded border border-gray-300 bg-white"
              placeholder="Ruta libre o sugerida, ej: /sale"
            />
            <datalist id="navigation-route-suggestions">
              <option value="/">Inicio</option>
              <option value="/sale">Ofertas</option>
              <option value="/tiendas">Tiendas</option>
              <option value="/productos">Catálogo</option>
              <option value="/login">Login</option>
              <option value="/carrito">Carrito</option>
              {categories?.map(c => (
                <option key={c.id} value={`/c/${c.slug}`}>{c.name}</option>
              ))}
            </datalist>
            <button 
              type="submit"
              disabled={isNavSaving || !newNavLabel || !newNavUrl}
              className="w-full bg-[#1C1C1C] text-white py-2 rounded text-xs font-bold uppercase disabled:opacity-50 hover:bg-gray-800"
            >
              {isNavSaving ? "Guardando..." : "Agregar"}
            </button>
            </form>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => setEditingGlobal(null)}
            className="w-full px-4 py-3 bg-gray-100 text-gray-800 rounded text-sm font-bold uppercase hover:bg-gray-200"
          >
            Atrás
          </button>
        </div>
      </div>
    )
  }

  if (editingSection) {
    return (
      <div className="flex flex-col h-full bg-white p-4 overflow-y-auto">
        <h3 className="font-bold text-lg mb-4 font-[var(--font-barlow)] uppercase tracking-wide">
          Editar: {SECTION_LABELS[editingSection.type]}
        </h3>
        
        <div className="flex-1 flex flex-col gap-4">
          {/* Universal config fields depending on type */}
          
          {/* El HERO no usa "título de sección": su texto grande sale de cada slide
              (banner.title), no de config.title — mostrar el campo aquí engañaba. */}
          {editingSection.type !== "CUSTOM_HTML" && editingSection.type !== "HERO" && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Título de Sección</label>
              <input
                type="text"
                value={configInput.title || ""}
                onChange={(e) => setConfigInput({...configInput, title: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
                placeholder="Ej: Los Más Vendidos"
              />
            </div>
          )}

          {editingSection.type === "HERO" && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Altura del Banner</label>
                <select
                  value={configInput.height || "85vh"}
                  onChange={(e) => setConfigInput({...configInput, height: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                >
                  <option value="50vh">Compacto (50vh)</option>
                  <option value="70vh">Mediano (70vh)</option>
                  <option value="85vh">Alto (85vh) — default</option>
                  <option value="100vh">Pantalla completa (100vh)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Opacidad del overlay oscuro: {Math.round((configInput.overlayOpacity ?? 0.4) * 100)}%
                </label>
                <input
                  type="range"
                  min={0} max={0.9} step={0.05}
                  value={configInput.overlayOpacity ?? 0.4}
                  onChange={(e) => setConfigInput({...configInput, overlayOpacity: parseFloat(e.target.value)})}
                  className="w-full accent-[#E31C23]"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Sin overlay</span><span>Muy oscuro</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Posición del Contenido</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { val: "top-left", label: "↖ Arriba izq" },
                    { val: "top-center", label: "↑ Arriba centro" },
                    { val: "top-right", label: "↗ Arriba der" },
                    { val: "center-left", label: "← Centro izq" },
                    { val: "center", label: "Centro" },
                    { val: "center-right", label: "→ Centro der" },
                    { val: "bottom-left", label: "↙ Abajo izq" },
                    { val: "bottom-center", label: "↓ Abajo centro" },
                    { val: "bottom-right", label: "↘ Abajo der" },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setConfigInput({...configInput, contentPosition: val})}
                      className={`py-1 text-[10px] font-bold rounded border transition-colors ${
                        (configInput.contentPosition || "bottom-left") === val
                          ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                          : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Texto del Botón CTA</label>
                <input
                  type="text"
                  value={configInput.ctaText || ""}
                  onChange={(e) => setConfigInput({...configInput, ctaText: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                  placeholder="Ver Detalles (default)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Estilo del Botón CTA</label>
                <div className="flex gap-2">
                  {[
                    { val: "white", label: "Blanco" },
                    { val: "red", label: "Rojo" },
                    { val: "outline", label: "Outline" },
                    { val: "black", label: "Negro" },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setConfigInput({...configInput, ctaStyle: val})}
                      className={`flex-1 py-1.5 text-xs font-bold rounded border transition-colors ${
                        (configInput.ctaStyle || "white") === val
                          ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                          : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Velocidad del carrusel: {configInput.autoplayMs || 5000}ms
                </label>
                <input
                  type="range"
                  min={2000} max={10000} step={500}
                  value={configInput.autoplayMs || 5000}
                  onChange={(e) => setConfigInput({...configInput, autoplayMs: parseInt(e.target.value)})}
                  className="w-full accent-[#E31C23]"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Rápido (2s)</span><span>Lento (10s)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showArrows"
                    checked={configInput.showArrows !== false}
                    onChange={(e) => setConfigInput({...configInput, showArrows: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="showArrows" className="text-sm text-gray-700">Mostrar flechas de navegación</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showDots"
                    checked={configInput.showDots !== false}
                    onChange={(e) => setConfigInput({...configInput, showDots: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="showDots" className="text-sm text-gray-700">Mostrar puntos indicadores</label>
                </div>
              </div>

            </>
          )}

          {(editingSection.type === "NEWSLETTER" || editingSection.type === "NEW_ARRIVALS") && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Subtítulo / Descripción</label>
              <textarea
                value={configInput.subtitle || ""}
                onChange={(e) => setConfigInput({...configInput, subtitle: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
                rows={3}
              />
            </div>
          )}

          {(editingSection.type === "FEATURED_PRODUCTS" || editingSection.type === "NEW_ARRIVALS") && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Límite de Productos</label>
              <input
                type="number"
                value={configInput.limit || 8}
                onChange={(e) => setConfigInput({...configInput, limit: parseInt(e.target.value)})}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
                min={1}
                max={20}
              />
            </div>
          )}

          {editingSection.type === "CATEGORY_GRID" && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Subtítulo</label>
                <input
                  type="text"
                  value={configInput.subtitle || ""}
                  onChange={(e) => setConfigInput({...configInput, subtitle: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
                  placeholder="Ej: Encuentra tu estilo"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Columnas en Desktop</label>
                <select
                  value={configInput.columns || 4}
                  onChange={(e) => setConfigInput({...configInput, columns: parseInt(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
                >
                  <option value={2}>2 columnas</option>
                  <option value={3}>3 columnas</option>
                  <option value={4}>4 columnas (default)</option>
                  <option value={5}>5 columnas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Altura de Tarjetas</label>
                <select
                  value={configInput.cardHeight || "md"}
                  onChange={(e) => setConfigInput({...configInput, cardHeight: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
                >
                  <option value="sm">Pequeña (128px)</option>
                  <option value="md">Mediana (160px) — default</option>
                  <option value="lg">Grande (200px)</option>
                  <option value="xl">Extra grande (240px)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Fondo de Sección</label>
                <div className="flex gap-2">
                  {["#FFFFFF", "#F5F5F5", "#1C1C1C", "#E31C23"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setConfigInput({...configInput, bgSection: color})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        configInput.bgSection === color ? "border-[#E31C23] scale-110" : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={configInput.bgSection || "#FFFFFF"}
                    onChange={(e) => setConfigInput({...configInput, bgSection: e.target.value})}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                    title="Color personalizado"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Alineación del Título</label>
                <div className="flex gap-2">
                  {(["left", "center", "right"] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setConfigInput({...configInput, titleAlign: align})}
                      className={`flex-1 py-1.5 text-xs font-bold rounded border transition-colors ${
                        (configInput.titleAlign || "center") === align
                          ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                          : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {align === "left" ? "← Izq" : align === "center" ? "Centro" : "Der →"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showAccent"
                  checked={configInput.showAccent !== false}
                  onChange={(e) => setConfigInput({...configInput, showAccent: e.target.checked})}
                  className="rounded border-gray-300"
                />
                <label htmlFor="showAccent" className="text-sm text-gray-700">Mostrar línea roja bajo el título</label>
              </div>
            </>
          )}

          {editingSection.type === "BRAND_STRIP" && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Separador</label>
                <input
                  type="text"
                  value={configInput.separator || "·"}
                  onChange={(e) => setConfigInput({...configInput, separator: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
                  placeholder="Ej: ·, -, o |"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Color de Fondo</label>
                <div className="flex gap-2">
                  {["#FFFFFF", "#F5F5F5", "#E0E0E0", "#1C1C1C"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setConfigInput({...configInput, bgSection: color})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        (configInput.bgSection || "#E0E0E0") === color ? "border-[#E31C23] scale-110" : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={configInput.bgSection || "#E0E0E0"}
                    onChange={(e) => setConfigInput({...configInput, bgSection: e.target.value})}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                    title="Color personalizado"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Color de Texto (Marcas)</label>
                <div className="flex gap-2">
                  {["#1C1C1C", "#4A4A4A", "#888888", "#FFFFFF"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setConfigInput({...configInput, textColor: color})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        (configInput.textColor || "#4A4A4A") === color ? "border-[#E31C23] scale-110" : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={configInput.textColor || "#4A4A4A"}
                    onChange={(e) => setConfigInput({...configInput, textColor: e.target.value})}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                    title="Color personalizado"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Tamaño de Texto</label>
                <select
                  value={configInput.fontSize || "sm"}
                  onChange={(e) => setConfigInput({...configInput, fontSize: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
                >
                  <option value="xs">Extra Pequeño (xs)</option>
                  <option value="sm">Pequeño (sm) — default</option>
                  <option value="base">Normal (base)</option>
                  <option value="lg">Grande (lg)</option>
                  <option value="xl">Extra Grande (xl)</option>
                </select>
              </div>
            </>
          )}

          {["CATEGORY_GRID", "FEATURED_PRODUCTS", "NEW_ARRIVALS", "NEWSLETTER", "PRODUCT_CAROUSEL"].includes(editingSection.type) && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                Tema Visual
              </label>
              <select
                value={configInput.theme || "light"}
                onChange={(e) => setConfigInput({...configInput, theme: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
              >
                <option value="light">Fondo Claro (Light)</option>
                <option value="dark">Fondo Oscuro (Dark)</option>
              </select>
            </div>
          )}

          {editingSection.type === "PRODUCT_CAROUSEL" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Estilo de Visualización</label>
                <select
                  value={configInput.layout || "carousel"}
                  onChange={(e) => setConfigInput({ ...configInput, layout: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
                >
                  <option value="carousel">Carrusel horizontal (tarjetas)</option>
                  <option value="showcase">Showcase / pasarela (producto grande que rota)</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  «Showcase» muestra un producto grande al centro que cambia de vista al mover el cursor, con el nombre de la marca en grande — estilo pasarela.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Buscar Productos</label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={async (e) => {
                      const val = e.target.value
                      setProductSearchQuery(val)
                      if (val.length >= 2) {
                        setIsSearchingProducts(true)
                        const results = await searchProductsAction(val)
                        setProductSearchResults(results)
                        setIsSearchingProducts(false)
                      } else {
                        setProductSearchResults([])
                      }
                    }}
                    placeholder="Buscar por nombre..."
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
                  />
                  {isSearchingProducts && (
                    <div className="absolute right-3 top-2.5">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-[#1C1C1C] rounded-full animate-spin" />
                    </div>
                  )}
                  {productSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto">
                      {productSearchResults.map(product => (
                        <div
                          key={product.id}
                          className="p-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-0"
                          onClick={() => {
                            const currentSlugs = configInput.productSlugs || []
                            if (!currentSlugs.includes(product.slug)) {
                              setConfigInput({
                                ...configInput,
                                productSlugs: [...currentSlugs, product.slug]
                              })
                            }
                            setProductSearchQuery("")
                            setProductSearchResults([])
                          }}
                        >
                          {product.imageUrl && (
                            <Image src={product.imageUrl} alt={product.name} width={40} height={40} unoptimized className="w-10 h-10 object-cover rounded" />
                          )}
                          <div>
                            <p className="text-sm font-bold text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.brand}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Productos Seleccionados</label>
                <div className="space-y-2">
                  {(configInput.productSlugs || []).map((slug: string, index: number) => (
                    <div key={slug} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded">
                      <span className="text-sm font-mono text-gray-700">{index + 1}. {slug}</span>
                      <button
                        onClick={() => {
                          const newSlugs = configInput.productSlugs.filter((s: string) => s !== slug)
                          setConfigInput({...configInput, productSlugs: newSlugs})
                        }}
                        className="text-red-500 hover:text-red-700 text-sm font-bold"
                      >
                        X
                      </button>
                    </div>
                  ))}
                  {!(configInput.productSlugs?.length > 0) && (
                    <p className="text-xs text-gray-400 italic">No hay productos seleccionados.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {editingSection.type === "CUSTOM_HTML" && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">HTML</label>
                <div className="border border-gray-300 rounded overflow-hidden">
                  <Editor
                    height="30vh"
                    defaultLanguage="html"
                    theme="vs-dark"
                    value={configInput.html || ""}
                    onChange={(value) => setConfigInput({...configInput, html: value})}
                    options={{ minimap: { enabled: false }, fontSize: 13 }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">CSS (Opcional)</label>
                <div className="border border-gray-300 rounded overflow-hidden">
                  <Editor
                    height="20vh"
                    defaultLanguage="css"
                    theme="vs-dark"
                    value={configInput.css || ""}
                    onChange={(value) => setConfigInput({...configInput, css: value})}
                    options={{ minimap: { enabled: false }, fontSize: 13 }}
                  />
                </div>
              </div>
            </>
          )}

        </div>

        <div className="flex justify-between mt-6 pt-4 border-t">
          <button
            onClick={() => setDeleteConfirm({ id: editingSection.id, label: SECTION_LABELS[editingSection.type] ?? editingSection.type })}
            className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded uppercase"
          >
            Eliminar Bloque
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setEditingSection(null)}
              className="px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded uppercase"
            >
              Volver
            </button>
            <button
              onClick={saveConfig}
              disabled={isSaving}
              className="px-4 py-2 bg-[#1C1C1C] text-white rounded text-xs font-bold uppercase hover:bg-gray-800 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Aplicar"}
            </button>
          </div>
        </div>
        {renderModals()}
      </div>
    )
  }

  if (isAddingBlock) {
    return (
      <div className="flex flex-col h-full bg-white p-4">
        <h3 className="font-bold text-lg mb-4 font-[var(--font-barlow)] uppercase tracking-wide">
          Añadir Nuevo Bloque
        </h3>
        
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
          {Object.entries(SECTION_LABELS).map(([type, label]) => (
            <button
              key={type}
              onClick={() => handleAddBlock(type as LandingSectionType)}
              disabled={isSaving}
              className="p-3 text-left border border-gray-200 rounded hover:border-[#1C1C1C] hover:bg-gray-50 transition-colors"
            >
              <div className="font-bold text-[#1C1C1C]">{label}</div>
              <div className="text-xs text-gray-500 font-mono mt-1">{type}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => setIsAddingBlock(false)}
            className="w-full px-4 py-3 bg-gray-100 text-gray-800 rounded text-sm font-bold uppercase hover:bg-gray-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full relative">
      {unavailableAreas.length > 0 && (
        <div className="m-4 mb-0 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Parte del contenido no pudo cargarse. Las áreas afectadas están bloqueadas hasta que recargues.
        </div>
      )}
      {/* Elementos Globales (No arrastrables) */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Elementos Globales</h3>
        <div className="flex flex-col gap-2">
          <button onClick={() => setEditingGlobal("TOP_BANNER")} disabled={isUnavailable("topBanner")} className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded hover:border-[#1C1C1C] transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed">
            <span className="text-sm font-medium text-gray-800">Top Banner (Promocional)</span>
            <span className="text-xs text-blue-600 font-bold">Editar ↗</span>
          </button>
          <button onClick={() => setEditingGlobal("BANNERS")} disabled={isUnavailable("banners")} className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded hover:border-[#1C1C1C] transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed">
            <span className="text-sm font-medium text-gray-800">Banners del Hero</span>
            <span className="text-xs text-blue-600 font-bold">Editar ↗</span>
          </button>
          <button onClick={() => setEditingGlobal("LOGOS")} disabled={isUnavailable("logos")} className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded hover:border-[#1C1C1C] transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed">
            <span className="text-sm font-medium text-gray-800">Logos (Header/Footer)</span>
            <span className="text-xs text-blue-600 font-bold">Editar ↗</span>
          </button>
          <button onClick={() => setEditingGlobal("NAVIGATION")} disabled={isUnavailable("navigation") || isUnavailable("header")} className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded hover:border-[#1C1C1C] transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed">
            <span className="text-sm font-medium text-gray-800">Menú de Navegación</span>
            <span className="text-xs text-blue-600 font-bold">Editar ↗</span>
          </button>
          <button onClick={() => setEditingGlobal("HOME_GRID")} disabled={isUnavailable("grid")} className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded hover:border-[#1C1C1C] transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed">
            <span className="text-sm font-medium text-gray-800">Tarjetas de la Grilla de Inicio</span>
            <span className="text-xs text-blue-600 font-bold">Editar ↗</span>
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bloques de la Página</h3>
        <button 
          onClick={() => setIsAddingBlock(true)}
          disabled={isUnavailable("sections")}
          className="text-xs bg-[#1C1C1C] text-white px-3 py-1.5 rounded font-bold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Agregar Bloque
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="landing-sections">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2 p-4"
            >
              {sections.map((section, index) => (
                <Draggable key={section.id} draggableId={section.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex flex-col bg-white border ${
                        snapshot.isDragging ? "shadow-xl ring-2 ring-[#1C1C1C] border-transparent scale-[1.02]" : "border-gray-200 shadow-sm hover:shadow-md"
                      } rounded-xl overflow-hidden transition-all duration-200`}
                    >
                      <div className="flex items-center gap-4 p-4">
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab text-gray-400 hover:text-[#1C1C1C] transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[15px] text-[#1C1C1C] truncate">
                            {(() => {
                               const config = typeof section.config === 'object' && section.config !== null ? section.config as Record<string, any> : {}
                               return config.title || SECTION_LABELS[section.type] || section.type
                            })()}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono uppercase tracking-widest mt-0.5">
                            {section.type}
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleActive(section.id, section.isActive)}
                          disabled={isSaving}
                          aria-label={section.isActive ? "Desactivar sección" : "Activar sección"}
                          className={`flex-shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            section.isActive ? 'bg-[#1C1C1C]' : 'bg-gray-300'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              section.isActive ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="bg-gray-50/50 px-4 py-2.5 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() => startEditingConfig(section)}
                          className="text-xs font-bold text-[#1C1C1C] hover:text-[#E31C23] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Configurar
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button
        onClick={() => setIsAddingBlock(true)}
        disabled={isUnavailable("sections")}
        className="w-full mt-6 px-4 py-3 border-2 border-dashed border-gray-300 text-gray-500 hover:text-[#1C1C1C] hover:border-[#1C1C1C] hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-2 font-bold uppercase text-sm tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Añadir Sección
      </button>

      {renderModals()}
    </div>
  )
}
