import { describe, it, expect, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("@/app/providers", () => ({
  useCspNonce: () => "mock-nonce-456",
}))

vi.mock("next/script", () => ({
  default: ({ id, src, nonce, strategy }: { id?: string; src?: string; nonce?: string; strategy?: string }) => {
    return <script id={id} data-src={src} nonce={nonce} data-strategy={strategy} />
  },
}))

vi.mock("@/server/actions/addi.actions", () => ({
  getAddiWidgetEvaluationAction: vi.fn(),
}))

import AddiWidget from "../AddiWidget"
import type { AddiWidgetEvaluation } from "@/server/services/addi-config.service"

const mockInRangeEvaluation: AddiWidgetEvaluation = {
  available: true,
  allySlug: "onestar-ecommerce",
  requestedAmount: 180000,
  minAmount: 50000,
  maxAmount: 3000000,
  inRange: true,
}

const mockOutOfRangeEvaluation: AddiWidgetEvaluation = {
  available: true,
  allySlug: "onestar-ecommerce",
  requestedAmount: 30000,
  minAmount: 50000,
  maxAmount: 3000000,
  inRange: false,
  outOfRangeNotice: "Addi aplica para compras entre $ 50.000 y $ 3.000.000",
}

const mockUnavailableEvaluation: AddiWidgetEvaluation = {
  available: false,
  allySlug: "onestar-ecommerce",
  requestedAmount: 180000,
  minAmount: 50000,
  maxAmount: 3000000,
  inRange: false,
}

describe("AddiWidget Component", () => {
  it("no renderiza nada si la evaluación no está disponible (aliado inactivo u oculto)", () => {
    const html = renderToStaticMarkup(
      <AddiWidget price={180000} initialEvaluation={mockUnavailableEvaluation} />
    )
    expect(html).toBe("")
  })

  it("no renderiza nada si el precio es cero o negativo", () => {
    const html = renderToStaticMarkup(
      <AddiWidget price={0} initialEvaluation={mockInRangeEvaluation} />
    )
    expect(html).toBe("")
  })

  it("renderiza el web component oficial <addi-widget> cuando está en rango", () => {
    const html = renderToStaticMarkup(
      <AddiWidget price={180000} initialEvaluation={mockInRangeEvaluation} />
    )

    expect(html).toContain("addi-widget")
    expect(html).toContain('price="180000"')
    expect(html).toContain('ally-slug="onestar-ecommerce"')
    expect(html).toContain('data-src="https://s3.amazonaws.com/widgets.addi.com/bundle.min.js"')
    expect(html).toContain('nonce="mock-nonce-456"')
    // No debe contener el cálculo inventado hardcodeado
    expect(html).not.toContain("sin interés")
    expect(html).not.toContain("3 cuotas")
  })

  it("muestra el aviso de rango legal cuando el monto está fuera de [minAmount, maxAmount]", () => {
    const html = renderToStaticMarkup(
      <AddiWidget price={30000} initialEvaluation={mockOutOfRangeEvaluation} />
    )

    expect(html).toContain("Addi aplica para compras entre $ 50.000 y $ 3.000.000")
    expect(html).toContain('role="status"')
    expect(html).not.toContain("<addi-widget")
  })

  it("inyecta el script oficial con nonce CSP", () => {
    const html = renderToStaticMarkup(
      <AddiWidget price={180000} initialEvaluation={mockInRangeEvaluation} />
    )

    expect(html).toContain('id="addi-widget-script"')
    expect(html).toContain('nonce="mock-nonce-456"')
    expect(html).toContain('data-src="https://s3.amazonaws.com/widgets.addi.com/bundle.min.js"')
  })
})
