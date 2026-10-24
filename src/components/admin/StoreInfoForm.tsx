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

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-1">Catálogo público</h2>
        <p className="text-xs text-[#4A4A4A] mb-4">Qué se muestra en la tienda, sin tocar el listado del admin.</p>
        <label className="mb-4 flex items-center gap-2 text-sm text-[#1C1C1C]">
          <input type="checkbox" name="hideImagelessProducts" defaultChecked={settings.hideImagelessProducts} className="h-4 w-4 accent-[#E31C23]" />
          Ocultar productos sin foto
        </label>
        <div>
          <label htmlFor="new-arrival-days" className={labelClass}>Días que un producto cuenta como lanzamiento</label>
          <input id="new-arrival-days" name="newArrivalDays" inputMode="numeric" defaultValue={settings.newArrivalDays} className={inputClass} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-1">Chat de ventas</h2>
        <label className="mb-4 flex items-center gap-2 text-sm text-[#1C1C1C]">
          <input type="checkbox" name="chatEnabled" defaultChecked={settings.chatEnabled} className="h-4 w-4 accent-[#E31C23]" />
          Mostrar el chat en la tienda
        </label>
        <label htmlFor="chat-welcome" className={labelClass}>Saludo</label>
        <textarea id="chat-welcome" name="chatWelcome" rows={3} defaultValue={settings.chatWelcome} className={inputClass} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-1">Tarjeta de regalo</h2>
        <p className="text-xs text-[#4A4A4A] mb-4">Los montos que se pueden comprar son los productos activos de la categoría. Aquí defines el rango permitido y la vigencia de las tarjetas nuevas.</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="gift-min" className={labelClass}>Monto mínimo</label>
            <input id="gift-min" name="giftCardMinAmount" inputMode="numeric" defaultValue={settings.giftCardMinAmount} className={inputClass} />
          </div>
          <div>
            <label htmlFor="gift-max" className={labelClass}>Monto máximo</label>
            <input id="gift-max" name="giftCardMaxAmount" inputMode="numeric" defaultValue={settings.giftCardMaxAmount} className={inputClass} />
          </div>
          <div>
            <label htmlFor="gift-months" className={labelClass}>Vigencia (meses)</label>
            <input id="gift-months" name="giftCardValidityMonths" inputMode="numeric" defaultValue={settings.giftCardValidityMonths} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-1">One Star Club</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="club-headline" className={labelClass}>Título</label>
            <input id="club-headline" name="clubHeadline" defaultValue={settings.clubHeadline} className={inputClass} />
          </div>
          <div>
            <label htmlFor="club-intro" className={labelClass}>Texto de la portada</label>
            <textarea id="club-intro" name="clubIntro" rows={3} defaultValue={settings.clubIntro} className={inputClass} />
          </div>
          <div>
            <label htmlFor="club-benefits" className={labelClass}>Beneficios, uno por línea: título | detalle</label>
            <textarea id="club-benefits" name="clubBenefits" rows={4} defaultValue={settings.clubBenefits} placeholder="Promociones exclusivas | Cupones solo para miembros." className={inputClass} />
          </div>
          <div>
            <label htmlFor="club-subject" className={labelClass}>Asunto del correo de bienvenida</label>
            <input id="club-subject" name="clubWelcomeSubject" defaultValue={settings.clubWelcomeSubject} className={inputClass} />
          </div>
          <div>
            <label htmlFor="club-body" className={labelClass}>Cuerpo del correo</label>
            <textarea id="club-body" name="clubWelcomeBody" rows={3} defaultValue={settings.clubWelcomeBody} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-1">Pie de página</h2>
        <p className="text-xs text-[#4A4A4A] mb-4">Un enlace por línea: Etiqueta | /ruta. Si lo dejas vacío se usan los enlaces de la tienda.</p>
        <textarea id="footer-links" name="footerLinks" rows={6} defaultValue={settings.footerLinks} placeholder={"Tienda | /productos\nTérminos | /terminos"} className={inputClass} />
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
