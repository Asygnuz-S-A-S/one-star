"use client"

import React, { useEffect, useState, useTransition } from "react"
import Script from "next/script"
import { useCspNonce } from "@/app/providers"
import { getAddiWidgetEvaluationAction } from "@/server/actions/addi.actions"
import type { AddiWidgetEvaluation } from "@/server/services/addi-config.service"

export interface AddiWidgetProps {
  price: number
  className?: string
  initialEvaluation?: AddiWidgetEvaluation | null
}

const ADDI_SCRIPT_SRC = "https://s3.amazonaws.com/widgets.addi.com/bundle.min.js"

export default function AddiWidget({
  price,
  className = "",
  initialEvaluation = null,
}: AddiWidgetProps) {
  const nonce = useCspNonce()
  const [evaluation, setEvaluation] = useState<AddiWidgetEvaluation | null>(initialEvaluation)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (price <= 0) return

    let cancelled = false
    startTransition(async () => {
      try {
        const evalResult = await getAddiWidgetEvaluationAction(price)
        if (!cancelled) {
          setEvaluation(evalResult)
        }
      } catch (err) {
        console.warn("[AddiWidget] Error al evaluar disponibilidad de Addi:", err)
      }
    })

    return () => {
      cancelled = true
    }
  }, [price])

  if (price <= 0 || !evaluation || !evaluation.available) {
    return null
  }

  return (
    <div
      className={`addi-widget-container ${className}`.trim()}
      data-testid="addi-widget-container"
    >
      <Script
        id="addi-widget-script"
        src={ADDI_SCRIPT_SRC}
        strategy="afterInteractive"
        nonce={nonce}
      />

      {evaluation.inRange ? (
        React.createElement("addi-widget", {
          price: Math.round(price),
          "ally-slug": evaluation.allySlug,
          "data-testid": "addi-widget-element",
        })
      ) : (
        <div
          role="status"
          aria-live="polite"
          data-testid="addi-out-of-range"
          className="flex items-center gap-2.5 p-2.5 rounded-lg border border-[#00C389]/30 bg-[#00C389]/5 text-[#1C1C1C] dark:text-gray-200 text-xs font-montserrat"
        >
          <span className="flex items-center justify-center bg-[#00C389] text-white font-bold text-[10px] px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0">
            addi
          </span>
          <span className="flex-1 text-[#4A4A4A] dark:text-gray-300">
            {evaluation.outOfRangeNotice}
          </span>
        </div>
      )}
    </div>
  )
}
