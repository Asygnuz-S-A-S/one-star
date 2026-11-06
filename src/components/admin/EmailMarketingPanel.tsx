"use client"

import { useState, useTransition } from "react"
import {
  previewEmailTemplateAction,
  saveEmailTemplateAction,
  sendEmailTemplateTestAction,
  syncMarketingAction,
} from "@/app/admin/email-marketing/actions"
import type { EmailTemplateAdminItem } from "@/server/services/email-settings.service"
import type { MarketingSyncResult } from "@/server/services/marketing.service"

interface Props {
  totalContacts: number
  segments: { name: string; count: number }[]
  templates: EmailTemplateAdminItem[]
  adminEmail: string
  resendConfigured: boolean
  webhookConfigured: boolean
  senderAddress: string
}

const card = "rounded-xl border border-gray-200 bg-white p-5"
const h2 = "font-barlow text-lg font-bold uppercase tracking-wide text-[#1C1C1C]"
const btnDark =
  "min-h-11 rounded-lg bg-[#1C1C1C] px-4 font-montserrat text-xs font-bold uppercase tracking-wider text-white hover:bg-[#333] disabled:opacity-50"
const btnRed =
  "min-h-11 rounded-lg bg-[#E31C23] px-4 font-montserrat text-xs font-bold uppercase tracking-wider text-white hover:bg-[#c41920] disabled:opacity-50"
const btnLine =
  "min-h-11 rounded-lg border border-gray-300 px-4 font-montserrat text-xs font-bold uppercase tracking-wider text-[#1C1C1C] hover:border-[#1C1C1C] disabled:opacity-50"
const input =
  "w-full rounded-lg border border-gray-300 px-3 py-2 font-montserrat text-sm text-[#1C1C1C] focus:border-[#E31C23] focus:outline-none"

export default function EmailMarketingPanel(props: Props) {
  return (
    <div className="space-y-6">
      <AudienceCard {...props} />
      <section className={card}>
        <h2 className={h2}>Correos automáticos</h2>
        <p className="mt-1 font-montserrat text-sm text-[#4A4A4A]">
          Cambia el asunto y el texto principal de cada correo. El diseño, el logo y los datos del pedido salen solos.
          Deja un campo vacío para usar el texto original.
        </p>
        <ul className="mt-4 divide-y divide-gray-100">
          {props.templates.map((template) => (
            <TemplateRow key={template.key} template={template} adminEmail={props.adminEmail} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function AudienceCard({ totalContacts, segments, resendConfigured, webhookConfigured, senderAddress }: Props) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<MarketingSyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const testSender = senderAddress.includes("resend.dev")

  function sync() {
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await syncMarketingAction()
      if (res.success) setResult(res.data ?? null)
      else setError(res.error)
    })
  }

  return (
    <section className={card}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className={h2}>Audiencia para campañas</h2>
          <p className="mt-1 font-montserrat text-sm text-[#4A4A4A]">
            <strong className="text-[#1C1C1C]">{totalContacts}</strong> personas aceptaron recibir publicidad. Solo ellas se
            suben a Resend.
          </p>
        </div>
        <button type="button" onClick={sync} disabled={pending || !resendConfigured} className={btnRed}>
          {pending ? "Sincronizando..." : "Sincronizar con Resend"}
        </button>
      </div>

      {!resendConfigured && <Notice tone="amber">Falta RESEND_API_KEY en el servidor: no se puede sincronizar.</Notice>}
      {resendConfigured && !webhookConfigured && (
        <Notice tone="amber">
          Falta RESEND_WEBHOOK_SECRET: las bajas hechas desde un correo de Resend no llegan a la tienda. No envíes campañas
          hasta configurarlo.
        </Notice>
      )}
      {testSender && (
        <Notice tone="amber">
          El remitente es de prueba ({senderAddress}). Las campañas necesitan el dominio verificado en Resend.
        </Notice>
      )}
      {error && <Notice tone="red">{error}</Notice>}
      {result && (
        <Notice tone="green">
          Listo: {result.contacts} contactos enviados a Resend en {result.segments.length} segmentos.
          {result.removedFromSegments > 0 && ` ${result.removedFromSegments} salieron de segmentos que ya no les aplican.`}
          {result.unsubscribed > 0 && ` ${result.unsubscribed} quedaron dados de baja por no tener consentimiento.`} Resend
          procesa la carga en unos minutos.
        </Notice>
      )}

      <table className="mt-4 w-full font-montserrat text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
            <th className="py-2 font-semibold">Segmento en Resend</th>
            <th className="py-2 text-right font-semibold">Personas</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((segment) => (
            <tr key={segment.name} className="border-t border-gray-100">
              <td className="py-2 text-[#1C1C1C]">{segment.name}</td>
              <td className="py-2 text-right tabular-nums text-[#1C1C1C]">{segment.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 rounded-lg bg-gray-50 p-4 font-montserrat text-sm text-[#4A4A4A]">
        <p className="font-semibold text-[#1C1C1C]">Cómo enviar una campaña</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Sincroniza antes de cada campaña.</li>
          <li>
            En Resend, ve a{" "}
            <a href="https://resend.com/broadcasts" target="_blank" rel="noreferrer" className="text-[#E31C23] underline">
              Broadcasts
            </a>{" "}
            → crea la campaña → elige el segmento.
          </li>
          <li>
            Puedes usar las variables de cada contacto: nombre, es_club, compras, total_gastado, ultima_compra y marcas.
          </li>
          <li>Resend agrega solo el enlace para darse de baja; la baja llega a la tienda automáticamente.</li>
        </ol>
      </div>
    </section>
  )
}

function TemplateRow({ template, adminEmail }: { template: EmailTemplateAdminItem; adminEmail: string }) {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState(template.subject)
  const [intro, setIntro] = useState(template.intro)
  const [enabled, setEnabled] = useState(template.enabled)
  const [testTo, setTestTo] = useState(adminEmail)
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null)
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const run = (fn: () => Promise<void>) => {
    setMessage(null)
    startTransition(fn)
  }

  const save = () =>
    run(async () => {
      const res = await saveEmailTemplateAction({ key: template.key, subject, intro, enabled })
      setMessage(res.success ? { tone: "green", text: "Guardado." } : { tone: "red", text: res.error })
    })

  const showPreview = () =>
    run(async () => {
      const res = await previewEmailTemplateAction({ key: template.key, subject, intro })
      if (res.success) setPreview(res.data ?? null)
      else setMessage({ tone: "red", text: res.error })
    })

  const sendTest = () =>
    run(async () => {
      const res = await sendEmailTemplateTestAction({ key: template.key, to: testTo })
      setMessage(
        res.success
          ? { tone: "green", text: `Prueba enviada a ${testTo} (versión guardada).` }
          : { tone: "red", text: res.error }
      )
    })

  return (
    <li className="py-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block font-montserrat text-sm font-semibold text-[#1C1C1C]">
            {template.label}
            {template.audience === "interno" && (
              <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase text-gray-600">Interno</span>
            )}
          </span>
          <span className="block font-montserrat text-xs text-gray-500">{template.trigger}</span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 font-montserrat text-[11px] font-semibold ${
            enabled ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {template.toggleable ? (enabled ? "Activo" : "Apagado") : "Obligatorio"}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
          {template.toggleable && (
            <label className="flex min-h-11 items-center gap-2 font-montserrat text-sm text-[#1C1C1C]">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
              Enviar este correo
            </label>
          )}

          {template.textEditable ? (
            <>
              <label className="block font-montserrat text-xs font-semibold uppercase tracking-wider text-gray-600">
                Asunto
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={150}
                  placeholder={template.defaultSubject}
                  className={`${input} mt-1 normal-case tracking-normal`}
                />
              </label>
              <label className="block font-montserrat text-xs font-semibold uppercase tracking-wider text-gray-600">
                Texto principal
                <textarea
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="Vacío = texto original"
                  className={`${input} mt-1 normal-case tracking-normal`}
                />
              </label>
              {template.placeholders.length > 0 && (
                <p className="font-montserrat text-xs text-gray-500">Puedes usar: {template.placeholders.join(", ")}</p>
              )}
            </>
          ) : (
            <p className="font-montserrat text-sm text-gray-600">{template.textNote}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={pending} className={btnDark}>
              Guardar
            </button>
            <button type="button" onClick={showPreview} disabled={pending} className={btnLine}>
              Vista previa
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              aria-label="Correo para la prueba"
              className={`${input} max-w-xs`}
            />
            <button type="button" onClick={sendTest} disabled={pending || !testTo} className={btnLine}>
              Enviar prueba
            </button>
          </div>

          {message && <Notice tone={message.tone}>{message.text}</Notice>}

          {preview && (
            <div className="space-y-2">
              <p className="font-montserrat text-xs text-gray-600">
                <strong>Asunto:</strong> {preview.subject}
              </p>
              <iframe
                title={`Vista previa: ${template.label}`}
                srcDoc={preview.html}
                sandbox=""
                className="h-[560px] w-full rounded-lg border border-gray-200 bg-white"
              />
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function Notice({ tone, children }: { tone: "green" | "red" | "amber"; children: React.ReactNode }) {
  const styles = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-[#E31C23]",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  }[tone]
  return (
    <p role={tone === "red" ? "alert" : "status"} className={`mt-3 rounded-lg border p-3 font-montserrat text-sm ${styles}`}>
      {children}
    </p>
  )
}
