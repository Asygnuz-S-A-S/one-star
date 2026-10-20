"use client"

import { useActionState, useState } from "react"
import { updateCatalogSourceAction } from "@/server/actions/store-settings.actions"
import type { CatalogSource } from "@/lib/catalog-source"

interface CatalogSourceSwitchProps {
  initialSource: CatalogSource
  isSuperAdmin: boolean
}

type FormState = { success: boolean; error?: string } | null

export default function CatalogSourceSwitch({
  initialSource,
  isSuperAdmin,
}: CatalogSourceSwitchProps) {
  const [selectedSource, setSelectedSource] = useState<CatalogSource>(initialSource)
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_previous, formData) => updateCatalogSourceAction(formData),
    null
  )

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1C1C1C]">Fuente de Verdad del Catálogo</h2>
          <p className="mt-1 text-sm text-gray-500">
            Define si el inventario, los precios y las tallas son gobernados por el archivo de inventario (Excel) o por un sistema ERP conectado.
          </p>
        </div>
        <div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              initialSource === "ARCHIVO"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                initialSource === "ARCHIVO" ? "bg-emerald-500" : "bg-blue-500"
              }`}
            />
            Modo activo: {initialSource}
          </span>
        </div>
      </header>

      {!isSuperAdmin && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
          ⚠️ Solo los usuarios con rol <strong>Super Admin</strong> pueden cambiar la fuente de verdad del catálogo.
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="catalogSource" value={selectedSource} />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Opción ARCHIVO */}
          <div
            onClick={() => isSuperAdmin && !pending && setSelectedSource("ARCHIVO")}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              selectedSource === "ARCHIVO"
                ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            } ${!isSuperAdmin || pending ? "cursor-not-allowed opacity-75" : ""}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceOption"
                  checked={selectedSource === "ARCHIVO"}
                  onChange={() => isSuperAdmin && !pending && setSelectedSource("ARCHIVO")}
                  disabled={!isSuperAdmin || pending}
                  className="h-4 w-4 accent-emerald-600 cursor-pointer"
                  id="source-archivo"
                />
                <label
                  htmlFor="source-archivo"
                  className="text-sm font-bold text-[#1C1C1C] cursor-pointer"
                >
                  ARCHIVO (Excel en tiempo real)
                </label>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Recomendado sin ERP
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              El inventario y precios se gestionan mediante el archivo Excel. Los productos existentes (incluso con identificador de ERP previo) reciben stock y precio del archivo, y pueden editarse libremente en el panel.
            </p>
          </div>

          {/* Opción ERP */}
          <div
            onClick={() => isSuperAdmin && !pending && setSelectedSource("ERP")}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              selectedSource === "ERP"
                ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-600 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            } ${!isSuperAdmin || pending ? "cursor-not-allowed opacity-75" : ""}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceOption"
                  checked={selectedSource === "ERP"}
                  onChange={() => isSuperAdmin && !pending && setSelectedSource("ERP")}
                  disabled={!isSuperAdmin || pending}
                  className="h-4 w-4 accent-blue-600 cursor-pointer"
                  id="source-erp"
                />
                <label
                  htmlFor="source-erp"
                  className="text-sm font-bold text-[#1C1C1C] cursor-pointer"
                >
                  ERP (Sistema contable)
                </label>
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                Mekano / Loggro
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              El ERP conectado es el dueño contable del catálogo. Los precios, tallas y existencias de productos sincronizados se bloquean para edición manual y no se sobrescriben desde el importador.
            </p>
          </div>
        </div>

        {state?.error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="rounded-lg bg-green-50 p-3 text-xs text-green-700 border border-green-200">
            Fuente del catálogo actualizada correctamente.
          </div>
        )}

        {isSuperAdmin && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={pending || selectedSource === initialSource}
              className="inline-flex items-center rounded-lg bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {pending ? "Guardando..." : "Guardar fuente del catálogo"}
            </button>
          </div>
        )}
      </form>
    </section>
  )
}
