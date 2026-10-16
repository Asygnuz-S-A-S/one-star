"use client"

import { useActionState } from "react"
import { updateStoreInfoAction } from "@/server/actions/store-settings.actions"
import type { StoreSettingsDTO } from "@/server/services/store-settings.service"

interface StoreInfoFormProps {
  settings: StoreSettingsDTO
}

type FormState = { success: boolean; error?: string } | null

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
const labelClass = "block text-xs font-semibold text-[#4A4A4A] mb-1"

export default function StoreInfoForm({ settings }: StoreInfoFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_previous, formData) => updateStoreInfoAction(formData),
    null,
  )

  return (
    <form action={formAction} className="space-y-8">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-1">
          Información de la tienda
        </h2>
        <p className="text-xs text-[#4A4A4A] mb-4">
          Datos de contacto que aparecen en emails y footer.
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="store-name" className={labelClass}>
              Nombre de la tienda
            </label>
            <input
              id="store-name"
              type="text"
              name="storeName"
              defaultValue={settings.storeName}
              placeholder="One Star"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="store-email" className={labelClass}>
              Email de contacto
            </label>
            <input
              id="store-email"
              type="email"
              name="contactEmail"
              defaultValue={settings.contactEmail ?? ""}
              placeholder="hola@onestar.co"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="store-whatsapp" className={labelClass}>
              WhatsApp (con código de país)
            </label>
            <input
              id="store-whatsapp"
              type="tel"
              name="whatsapp"
              defaultValue={settings.whatsapp ?? ""}
              placeholder="+573001234567"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {state && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${
            state.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {state.success ? "Configuración guardada." : state.error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="bg-[#E31C23] text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  )
}
