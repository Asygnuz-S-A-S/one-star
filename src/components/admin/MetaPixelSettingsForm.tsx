"use client"

import { useActionState } from "react"
import { updateMetaPixelAction } from "@/server/actions/store-settings.actions"
import type { StoreSettingsDTO } from "@/server/services/store-settings.service"

interface MetaPixelSettingsFormProps {
  settings: StoreSettingsDTO
}

type FormState = { success: boolean; error?: string } | null

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
const labelClass = "mb-1 block text-xs font-semibold text-[#4A4A4A]"

export default function MetaPixelSettingsForm({ settings }: MetaPixelSettingsFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_previous, formData) => updateMetaPixelAction(formData),
    null,
  )

  const isLive = settings.metaPixelEnabled && Boolean(settings.metaPixelId)
  const capiReady = isLive && settings.hasMetaAccessToken

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1C1C1C]">Meta Pixel y API de Conversiones</h2>
          <p className="mt-1 text-sm text-gray-500">
            Eventos PageView, ViewContent, AddToCart, InitiateCheckout y Purchase en la tienda,
            más el Purchase server-side desde el webhook de pago.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs font-semibold">
          <StatusPill on={isLive} onLabel="Píxel activo" offLabel="Píxel inactivo" />
          <StatusPill on={capiReady} onLabel="API de Conversiones lista" offLabel="Sin token de API" />
        </div>
      </header>

      <form action={formAction} className="space-y-4">
        <label className="flex items-center gap-3 text-sm text-[#1C1C1C]">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings.metaPixelEnabled}
            className="h-4 w-4 accent-[#E31C23]"
          />
          Activar el píxel en la tienda pública
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="meta-pixel-id" className={labelClass}>
              ID del píxel
            </label>
            <input
              id="meta-pixel-id"
              name="pixelId"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              defaultValue={settings.metaPixelId ?? ""}
              placeholder="123456789012345"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              Events Manager → Orígenes de datos → tu píxel → ID del conjunto de datos.
            </p>
          </div>
          <div>
            <label htmlFor="meta-test-code" className={labelClass}>
              Código de evento de prueba (opcional)
            </label>
            <input
              id="meta-test-code"
              name="testEventCode"
              type="text"
              autoComplete="off"
              defaultValue={settings.metaTestEventCode ?? ""}
              placeholder="TEST12345"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              Solo mientras pruebas: los eventos server-side aparecen en la pestaña
              &quot;Probar eventos&quot;. Bórralo al salir a producción.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="meta-access-token" className={labelClass}>
            Token de acceso de la API de Conversiones
          </label>
          <input
            id="meta-access-token"
            name="accessToken"
            type="password"
            autoComplete="new-password"
            placeholder={
              settings.hasMetaAccessToken
                ? `Guardado (termina en …${settings.metaAccessTokenHint}). Deja vacío para conservarlo.`
                : "Pega aquí el token generado en Events Manager"
            }
            className={inputClass}
          />
          {settings.hasMetaAccessToken && (
            <label className="mt-2 flex items-center gap-2 text-xs text-[#4A4A4A]">
              <input type="checkbox" name="clearAccessToken" className="h-3.5 w-3.5 accent-[#E31C23]" />
              Eliminar el token guardado
            </label>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Se guarda en el servidor y nunca se envía al navegador. Sin token, el píxel sigue
            funcionando pero no se envía el Purchase server-side.
          </p>
        </div>

        {state && (
          <p
            role="status"
            className={`rounded-lg px-3 py-2 text-sm ${
              state.success
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {state.success ? "Configuración de Meta guardada." : state.error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-[#E31C23] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar Meta"}
          </button>
        </div>
      </form>
    </section>
  )
}

function StatusPill({ on, onLabel, offLabel }: { on: boolean; onLabel: string; offLabel: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
        on ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${on ? "bg-emerald-500" : "bg-gray-400"}`}
        aria-hidden
      />
      {on ? onLabel : offLabel}
    </span>
  )
}
