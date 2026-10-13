"use client"

import React, { useState, useTransition } from "react"
import type { SiteContentDTO } from "@/server/services/site-content.service"
import { updateSiteContentAction } from "@/app/admin/contenido/actions"
import { faqsToText } from "@/lib/product-faq"
import { STANDARD_SHIPPING_THRESHOLD } from "@/lib/shipping"
import { DELIVERY_BUSINESS_DAYS } from "@/lib/conversion-signals"
import { formatCOP } from "@/lib/shop-utils"

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"

export default function SiteContentManager({ initialContent }: { initialContent: SiteContentDTO }) {
  const [highlightsText, setHighlightsText] = useState((initialContent.highlights ?? []).join("\n"))
  const [faqsText, setFaqsText] = useState(faqsToText(initialContent.faqs ?? []))
  const [returnWindowDays, setReturnWindowDays] = useState(initialContent.returnWindowDays ?? 30)

  // Custom promises
  const returnsPromise = initialContent.promises?.find((p) => p.id === "returns")
  const paymentPromise = initialContent.promises?.find((p) => p.id === "payment")
  const supportPromise = initialContent.promises?.find((p) => p.id === "support")

  const [returnsTitle, setReturnsTitle] = useState(
    returnsPromise?.title ?? `${initialContent.returnWindowDays ?? 30} días para cambios`
  )
  const [returnsText, setReturnsText] = useState(
    returnsPromise?.text ?? "Si no te queda o no te convence, lo cambias sin costo."
  )

  const [paymentTitle, setPaymentTitle] = useState(paymentPromise?.title ?? "Pago 100% seguro")
  const [paymentText, setPaymentText] = useState(
    paymentPromise?.text ?? "Pagas en ePayco, una pasarela certificada: no guardamos tus datos de pago."
  )

  const [supportTitle, setSupportTitle] = useState(supportPromise?.title ?? "Te asesoramos por WhatsApp")
  const [supportText, setSupportText] = useState(
    supportPromise?.text ?? "Resolvemos tallas y dudas antes de que compres."
  )

  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)

    const fd = new FormData()
    fd.set("highlights", highlightsText)
    fd.set("faqs", faqsText)
    fd.set("returnWindowDays", String(returnWindowDays))
    fd.set("returnsTitle", returnsTitle)
    fd.set("returnsText", returnsText)
    fd.set("paymentTitle", paymentTitle)
    fd.set("paymentText", paymentText)
    fd.set("supportTitle", supportTitle)
    fd.set("supportText", supportText)

    startTransition(async () => {
      const res = await updateSiteContentAction(fd)
      if (res.success) {
        setStatus({ ok: true, msg: "Contenido global y promesas guardados exitosamente." })
      } else {
        setStatus({ ok: false, msg: res.error ?? "No se pudo guardar la configuración." })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl" data-testid="site-content-form">
      {status && (
        <div
          className={`p-4 rounded-xl text-sm font-medium ${
            status.ok
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {status.msg}
        </div>
      )}

      {/* 1. Beneficios Globales */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#1C1C1C] mb-1">1. Beneficios Globales (Highlights)</h2>
        <p className="text-xs text-[#4A4A4A] mb-4">
          Se muestran en productos que no tengan beneficios propios ni de su marca. Formato: una línea por beneficio (opcional &ldquo;Título: Detalle&rdquo;).
        </p>
        <textarea
          rows={5}
          value={highlightsText}
          onChange={(e) => setHighlightsText(e.target.value)}
          placeholder={"100% Originales: Garantía de autenticidad en cada par\nCambios sin costo: Tienes hasta 30 días para solicitar cambio de talla"}
          className={inputCls}
        />
      </div>

      {/* 2. Preguntas Frecuentes Globales */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#1C1C1C] mb-1">2. Preguntas Frecuentes Globales (FAQs)</h2>
        <p className="text-xs text-[#4A4A4A] mb-4">
          Se muestran como fallback en la ficha de producto y alimentan el schema FAQPage en Google. Una pregunta por línea separada con &ldquo;|&rdquo;.
        </p>
        <textarea
          rows={6}
          value={faqsText}
          onChange={(e) => setFaqsText(e.target.value)}
          placeholder={"¿Los productos son originales? | Todos nuestros productos son 100% originales.\n¿Cómo es el proceso de cambios? | Cuentas con 30 días de garantía sin costo."}
          className={inputCls}
        />
      </div>

      {/* 3. Días de Devolución con Aviso Legal */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#1C1C1C] mb-1">3. Política y Plazo de Devoluciones</h2>
        <p className="text-xs text-[#4A4A4A] mb-4">
          Plazo en días para cambios y devoluciones. Se sincroniza con el schema MerchantReturnPolicy de Google.
        </p>

        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 leading-relaxed">
          <strong>⚠️ Aviso Legal Importante:</strong> El plazo aquí configurado debe coincidir exactamente con la{" "}
          <strong>Sección 9 de /terminos</strong> (Términos y Condiciones de Cambios y Devoluciones). Si se modifica este valor, asegúrate de actualizar la política legal para evitar discrepancias ante Google y el consumidor.
        </div>

        <div className="w-48">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Días para cambios y garantías</label>
          <input
            type="number"
            min={1}
            max={365}
            value={returnWindowDays}
            onChange={(e) => setReturnWindowDays(Number(e.target.value))}
            className={inputCls}
            required
          />
        </div>
      </div>

      {/* 4. Promesas de la Tienda */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#1C1C1C] mb-1">4. Promesas de la Tienda (Conversión)</h2>
          <p className="text-xs text-[#4A4A4A]">
            Aparecen junto al botón de compra y en la sección &ldquo;Por qué comprarlo&rdquo;.
          </p>
        </div>

        {/* Envío (Fijo de solo lectura) */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              🚚 Envío a todo Colombia (Lógica del Checkout)
            </span>
            <span className="text-[11px] font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
              Solo lectura (código)
            </span>
          </div>
          <p className="text-sm font-semibold text-[#1C1C1C]">Envío a todo Colombia</p>
          <p className="text-xs text-gray-600">
            Gratis en compras desde {formatCOP(STANDARD_SHIPPING_THRESHOLD)}.
          </p>
          <p className="text-[11px] text-gray-400 italic">
            El umbral de envío gratis está acoplado al cálculo real del carrito/checkout en <code>src/lib/shipping.ts</code>.
          </p>
        </div>

        {/* Plazo de Entrega (Fijo de solo lectura) */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              ⏱️ Plazo de Entrega
            </span>
            <span className="text-[11px] font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
              Solo lectura (código)
            </span>
          </div>
          <p className="text-sm font-semibold text-[#1C1C1C]">
            Entrega en {DELIVERY_BUSINESS_DAYS.min} a {DELIVERY_BUSINESS_DAYS.max} días hábiles
          </p>
          <p className="text-xs text-gray-600">Recibes número de guía apenas se despacha.</p>
          <p className="text-[11px] text-gray-400 italic">
            Proviene de las constantes de logística en <code>src/lib/conversion-signals.ts</code>.
          </p>
        </div>

        {/* Devoluciones (Editable) */}
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <span className="text-xs font-bold text-[#1C1C1C] uppercase tracking-wide flex items-center gap-2">
            🔄 Promesa de Cambios y Devoluciones
          </span>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título de la promesa</label>
              <input
                value={returnsTitle}
                onChange={(e) => setReturnsTitle(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Texto descriptivo</label>
              <input
                value={returnsText}
                onChange={(e) => setReturnsText(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>
        </div>

        {/* Pago Seguro (Editable) */}
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <span className="text-xs font-bold text-[#1C1C1C] uppercase tracking-wide flex items-center gap-2">
            🛡️ Promesa de Pago Seguro
          </span>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título de la promesa</label>
              <input
                value={paymentTitle}
                onChange={(e) => setPaymentTitle(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Texto descriptivo</label>
              <input
                value={paymentText}
                onChange={(e) => setPaymentText(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>
        </div>

        {/* Soporte WhatsApp (Editable) */}
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <span className="text-xs font-bold text-[#1C1C1C] uppercase tracking-wide flex items-center gap-2">
            💬 Asesoría por WhatsApp (si hay número configurado)
          </span>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título de la promesa</label>
              <input
                value={supportTitle}
                onChange={(e) => setSupportTitle(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Texto descriptivo</label>
              <input
                value={supportText}
                onChange={(e) => setSupportText(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-[#E31C23] px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-[#c01018] transition-all disabled:opacity-50 cursor-pointer"
        >
          {isPending ? "Guardando cambios…" : "Guardar Contenido Global"}
        </button>
      </div>
    </form>
  )
}
