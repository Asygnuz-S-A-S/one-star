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

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-1">
          Envíos
        </h2>
        <p className="text-xs text-[#4A4A4A] mb-4">
          Estos valores son los que cobra el carrito, el checkout y el chat. Escríbelos en pesos, sin puntos.
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="free-shipping" className={labelClass}>
              Envío estándar gratis desde
            </label>
            <input
              id="free-shipping"
              type="text"
              inputMode="numeric"
              name="freeShippingThreshold"
              defaultValue={settings.freeShippingThreshold}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="standard-shipping" className={labelClass}>
              Costo del envío estándar
            </label>
            <input
              id="standard-shipping"
              type="text"
              inputMode="numeric"
              name="standardShippingCost"
              defaultValue={settings.standardShippingCost}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="express-shipping" className={labelClass}>
              Costo del envío express
            </label>
            <input
              id="express-shipping"
              type="text"
              inputMode="numeric"
              name="expressShippingCost"
              defaultValue={settings.expressShippingCost}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-1">
          Datos legales
        </h2>
        <p className="text-xs text-[#4A4A4A] mb-4">
          Aparecen en Términos y Privacidad. Si falta la razón social, el NIT, el domicilio o el correo, esas páginas muestran un aviso.
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="legal-name" className={labelClass}>
              Razón social
            </label>
            <input
              id="legal-name"
              type="text"
              name="legalName"
              defaultValue={settings.legalName ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="tax-id" className={labelClass}>
              NIT
            </label>
            <input
              id="tax-id"
              type="text"
              name="taxId"
              defaultValue={settings.taxId ?? ""}
              placeholder="900123456-7"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="legal-address" className={labelClass}>
              Domicilio
            </label>
            <input
              id="legal-address"
              type="text"
              name="legalAddress"
              defaultValue={settings.legalAddress ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="contact-phone" className={labelClass}>
              Teléfono de atención
            </label>
            <input
              id="contact-phone"
              type="tel"
              name="contactPhone"
              defaultValue={settings.contactPhone ?? ""}
              placeholder="+576066666666"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur">
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
