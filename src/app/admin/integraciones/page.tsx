"use client"

import { useState } from "react"
import { syncCatalogAction } from "@/server/actions/erp.actions"

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; processedCount?: number; error?: string } | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setResult(null)
    const res = await syncCatalogAction()
    setResult(res)
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Integraciones</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Sincronización de ERP (Loggro)</h2>
        <p className="text-gray-600 mb-6">
          Importa y sincroniza el catálogo de productos desde el ERP. 
          Los productos nuevos se crearán en la base de datos local y los existentes actualizarán su precio y stock.
        </p>
        
        <button
          onClick={handleSync}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors disabled:opacity-50"
        >
          {loading ? "Sincronizando..." : "Sincronizar Catálogo Ahora"}
        </button>

        {result && (
          <div className={`mt-6 p-4 rounded-md ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            {result.success ? (
              <div className="text-green-800">
                <p className="font-semibold">¡Sincronización Completada!</p>
                <p>Se procesaron {result.processedCount} productos.</p>
              </div>
            ) : (
              <div className="text-red-800">
                <p className="font-semibold">Ocurrió un error</p>
                <p>{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
