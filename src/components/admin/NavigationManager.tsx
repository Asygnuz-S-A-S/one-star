"use client"

import React, { useState } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { NavigationItem } from "@prisma/client"
import { 
  createNavigationItemAction,
  updateNavigationItemAction,
  deleteNavigationItemAction,
  updateNavigationPositionsAction,
  toggleNavigationItemActiveAction
} from "@/server/actions/navigation.actions"

interface NavigationManagerProps {
  initialItems: NavigationItem[]
}

export default function NavigationManager({ initialItems }: NavigationManagerProps) {
  const [items, setItems] = useState(initialItems)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  // Form
  const [label, setLabel] = useState("")
  const [href, setHref] = useState("")
  const [isSale, setIsSale] = useState(false)

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const { source, destination } = result
    if (source.index === destination.index) return

    const newItems = Array.from(items)
    const [moved] = newItems.splice(source.index, 1)
    newItems.splice(destination.index, 0, moved)

    const updatedItems = newItems.map((item, i) => ({
      ...item,
      position: i + 1,
    }))

    setItems(updatedItems)
    setIsSaving(true)
    
    await updateNavigationPositionsAction(
      updatedItems.map(item => ({ id: item.id, position: item.position }))
    )
    
    setIsSaving(false)
  }

  const startEdit = (item: NavigationItem) => {
    setIsEditing(item.id)
    setLabel(item.label)
    setHref(item.href)
    setIsSale(item.isSale)
    setError("")
  }

  const cancelEdit = () => {
    setIsEditing(null)
    setLabel("")
    setHref("")
    setIsSale(false)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError("")

    let result
    if (isEditing) {
      result = await updateNavigationItemAction(isEditing, label, href, isSale)
    } else {
      result = await createNavigationItemAction(label, href, isSale)
    }

    if (result.success) {
      window.location.reload()
    } else {
      setError(result.error || "Ocurrió un error")
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este enlace del menú?")) return
    
    setIsSaving(true)
    const result = await deleteNavigationItemAction(id)
    if (result.success) {
      window.location.reload()
    } else {
      alert(result.error)
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const newActive = !currentActive
    setItems(items.map(item => item.id === id ? { ...item, isActive: newActive } : item))
    await toggleNavigationItemActiveAction(id, newActive)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formulario */}
      <div className="bg-white p-6 border border-[#E0E0E0] shadow-sm rounded-md h-fit">
        <h2 className="font-[var(--font-barlow)] font-bold text-xl mb-4">
          {isEditing ? "Editar Enlace" : "Nuevo Enlace"}
        </h2>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 mb-4 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre (Label)</label>
            <input
              required
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Ej. Colección Verano"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Enlace (URL)</label>
            <input
              required
              type="text"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
              placeholder="Ej. /c/coleccion-verano"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isSale"
              checked={isSale}
              onChange={(e) => setIsSale(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isSale" className="text-sm text-gray-700 font-medium">
              Resaltar en rojo (Estilo SALE)
            </label>
          </div>
          
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSaving || !label || !href}
              className="flex-1 bg-[#1C1C1C] text-white py-2 rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Drag and drop list */}
      <div className="lg:col-span-2">
        {isSaving && (
          <div className="bg-blue-50 text-blue-800 p-3 mb-4 text-sm font-medium animate-pulse rounded-md">
            Guardando cambios...
          </div>
        )}
        
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="navigation-items">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {items.length === 0 && (
                  <div className="p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded-md">
                    No hay enlaces en el menú. Crea uno a la izquierda.
                  </div>
                )}
                
                {items.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-4 bg-white p-4 border border-[#E0E0E0] shadow-sm rounded-md transition-shadow ${
                          snapshot.isDragging ? "shadow-lg ring-2 ring-[#1C1C1C]" : ""
                        }`}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab text-gray-400 hover:text-gray-700 p-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        
                        <div className="flex-1">
                          <div className={`font-[var(--font-barlow)] font-bold text-lg ${item.isSale ? 'text-[#E31C23]' : 'text-[#1C1C1C]'}`}>
                            {item.label}
                          </div>
                          <div className="text-sm text-gray-500 font-mono mt-0.5">
                            {item.href}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleActive(item.id, item.isActive)}
                            className={`px-3 py-1 text-sm font-bold w-24 text-center rounded transition-colors ${
                              item.isActive
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {item.isActive ? "Activo" : "Oculto"}
                          </button>
                          
                          <button
                            onClick={() => startEdit(item)}
                            className="text-blue-600 hover:underline text-sm font-medium"
                          >
                            Editar
                          </button>
                          
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:underline text-sm font-medium"
                          >
                            Eliminar
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
      </div>
    </div>
  )
}
