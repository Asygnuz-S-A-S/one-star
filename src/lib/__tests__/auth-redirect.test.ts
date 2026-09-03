import { describe, expect, it } from "vitest"

import { getSafeCallbackUrl } from "@/lib/auth-redirect"

describe("getSafeCallbackUrl", () => {
  it("conserva el callback de checkout", () => {
    expect(getSafeCallbackUrl("/checkout")).toBe("/checkout")
  })

  it("conserva rutas locales inequívocas con query y fragmento", () => {
    expect(getSafeCallbackUrl("/cuenta/pedidos?tab=recientes#pedido-1")).toBe(
      "/cuenta/pedidos?tab=recientes#pedido-1",
    )
  })

  it("rechaza una URL externa", () => {
    expect(getSafeCallbackUrl("https://evil.example/steal")).toBe("/cuenta")
  })

  it("rechaza una URL relativa al protocolo", () => {
    expect(getSafeCallbackUrl("//evil.example/steal")).toBe("/cuenta")
  })

  it("rechaza callbacks con barras invertidas", () => {
    expect(getSafeCallbackUrl("/\\evil.example/steal")).toBe("/cuenta")
  })

  it("usa el fallback cuando no hay callback", () => {
    expect(getSafeCallbackUrl(null)).toBe("/cuenta")
  })

  it("usa un fallback interno personalizado", () => {
    expect(getSafeCallbackUrl(null, "/checkout")).toBe("/checkout")
  })

  it("descarta un fallback externo", () => {
    expect(getSafeCallbackUrl(null, "https://evil.example/steal")).toBe("/cuenta")
  })

  it("rechaza callbacks ambiguos con caracteres de control", () => {
    expect(getSafeCallbackUrl("/\n//evil.example/steal")).toBe("/cuenta")
  })

  it("rechaza callbacks con espacios externos ambiguos", () => {
    expect(getSafeCallbackUrl("/checkout ")).toBe("/cuenta")
  })

  it.each(["javascript:alert(1)", "data:text/html,malicioso", "", "checkout"])(
    "rechaza el callback no local o ambiguo %j",
    (callbackUrl) => {
      expect(getSafeCallbackUrl(callbackUrl)).toBe("/cuenta")
    },
  )
})
