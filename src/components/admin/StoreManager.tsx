"use client"

import React, { useState } from "react"
import dynamic from "next/dynamic"
import type { StoreLocation } from "@prisma/client"
import { 
  createStoreAction, 
  updateStoreAction, 
  deleteStoreAction,
  toggleStoreActiveAction
} from "@/server/actions/store.actions"

const AdminMapPicker = dynamic(() => import("./AdminMapPicker"), { ssr: false })

export default function StoreManager({ initialStores }: { initialStores: StoreLocation[] }) {
  const [stores, setStores] = useState(initialStores)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  
  // Form state
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [phone, setPhone] = useState("")
  const [schedule, setSchedule] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [isActive, setIsActive] = useState(true)
  
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  const [isSearchingMap, setIsSearchingMap] = useState(false)

  const startEdit = (store: StoreLocation) => {
    setIsEditing(store.id)
    setName(store.name)
    setAddress(store.address)
    setCity(store.city)
    setPhone(store.phone || "")
    setSchedule(store.schedule || "")
    setLatitude(store.latitude)
    setLongitude(store.longitude)
    setIsActive(store.isActive)
    setError("")
  }

  const cancelEdit = () => {
    setIsEditing(null)
    setName("")
    setAddress("")
    setCity("")
    setPhone("")
    setSchedule("")
    setLatitude(null)
    setLongitude(null)
    setIsActive(true)
    setError("")
  }

  const searchAddressOnMap = async () => {
    if (!address || !city) {
      alert("Por favor ingresa la dirección y la ciudad primero.")
      return
    }
    setIsSearchingMap(true)
    try {
      const query = encodeURIComponent(`${address}, ${city}`)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
      const data = await res.json()
      if (data && data.length > 0) {
        setLatitude(parseFloat(data[0].lat))
        setLongitude(parseFloat(data[0].lon))
      } else {
        alert("No se encontró la ubicación exacta. Por favor mueve el pin manualmente en el mapa.")
      }
    } catch (e) {
      console.error(e)
      alert("Error al buscar la ubicación.")
    } finally {
      setIsSearchingMap(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError("")

    const data = { name, address, city, phone, schedule, latitude, longitude, isActive }

    let result
    if (isEditing) {
      result = await updateStoreAction(isEditing, data)
    } else {
      result = await createStoreAction(data)
    }

    if (result.success) {
      window.location.reload()
    } else {
      setError(result.error || "Ocurrió un error")
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta sucursal? Esta acción no se puede deshacer.")) return
    
    setIsSaving(true)
    const result = await deleteStoreAction(id)
    if (result.success) {
      window.location.reload()
    } else {
      alert(result.error)
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const newActive = !currentActive
    setStores(stores.map(s => s.id === id ? { ...s, isActive: newActive } : s))
    await toggleStoreActiveAction(id, newActive)
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* Formulario */}
      <div className="bg-white p-6 border border-[#E0E0E0] shadow-sm rounded-md h-fit xl:col-span-1">
        <h2 className="font-[var(--font-barlow)] font-bold text-xl mb-4">
          {isEditing ? "Editar Sucursal" : "Nueva Sucursal"}
        </h2>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 mb-4 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de Sucursal</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Ej. Tienda Centro"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Dirección</label>
              <input
                required
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Ej. Cra 12 #34-56"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Ciudad</label>
              <input
                required
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Ej. Bogotá"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              type="button" 
              onClick={searchAddressOnMap} 
              disabled={isSearchingMap || !address || !city}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded font-medium disabled:opacity-50 flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {isSearchingMap ? "Buscando..." : "Buscar coordenadas"}
            </button>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Horario (Opcional)</label>
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Ej. L-S: 10am - 8pm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono (Opcional)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Ej. 300 123 4567"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Ubicación en el Mapa</label>
            <p className="text-xs text-gray-500 mb-2">Haz clic en el mapa para ubicar la tienda con exactitud.</p>
            <AdminMapPicker 
              position={latitude && longitude ? { lat: latitude, lng: longitude } : null}
              onChange={(lat, lng) => {
                setLatitude(lat)
                setLongitude(lng)
              }}
            />
            {latitude && longitude && (
              <p className="text-xs text-gray-400 mt-1">Coords: {latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700 font-medium">
              Publicar inmediatamente (Activa)
            </label>
          </div>
          
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={isSaving || !name || !address || !city}
              className="flex-1 bg-[#1C1C1C] text-white py-2 rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isSaving ? "Guardando..." : "Guardar Sucursal"}
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

      {/* Lista */}
      <div className="xl:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.length === 0 && (
            <div className="md:col-span-2 p-8 text-center text-gray-500 bg-white border border-[#E0E0E0] rounded-md">
              No hay tiendas creadas. Utiliza el formulario para añadir tu primera sucursal.
            </div>
          )}
          
          {stores.map((store) => (
            <div key={store.id} className="bg-white border border-[#E0E0E0] shadow-sm rounded-md overflow-hidden flex flex-col h-full">
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-[var(--font-barlow)] font-bold text-lg text-[#1C1C1C] leading-tight">
                    {store.name}
                  </h3>
                  <button
                    onClick={() => handleToggleActive(store.id, store.isActive)}
                    className={`px-2 py-0.5 text-xs font-bold rounded transition-colors ${
                      store.isActive
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {store.isActive ? "ACTIVA" : "OCULTA"}
                  </button>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1 mb-4 flex-1">
                  <p><strong>Dirección:</strong> {store.address}, {store.city}</p>
                  {store.schedule && <p><strong>Horario:</strong> {store.schedule}</p>}
                  {store.phone && <p><strong>Teléfono:</strong> {store.phone}</p>}
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-gray-100 mt-auto">
                  <button
                    onClick={() => startEdit(store)}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(store.id)}
                    className="text-red-600 hover:underline text-sm font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
