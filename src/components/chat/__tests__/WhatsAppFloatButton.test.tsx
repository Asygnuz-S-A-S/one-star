import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

const cartState = { isOpen: false }
vi.mock("@/store", () => ({
  useCartStore: (selector: (s: typeof cartState) => unknown) => selector(cartState),
}))

import WhatsAppFloatButton from "../WhatsAppFloatButton"

describe("WhatsAppFloatButton", () => {
  it("enlaza al número de la configuración con un mensaje inicial", () => {
    const html = renderToStaticMarkup(<WhatsAppFloatButton number="+57 300 123 4567" aboveChat />)
    expect(html).toContain('href="https://wa.me/573001234567?text=')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it("se apila encima del chat o toma su lugar si el chat está apagado", () => {
    expect(renderToStaticMarkup(<WhatsAppFloatButton number="3001234567" aboveChat />)).toContain("lg:bottom-[5.75rem]")
    expect(renderToStaticMarkup(<WhatsAppFloatButton number="3001234567" aboveChat={false} />)).toContain("lg:bottom-6")
  })

  it("no se muestra sin número válido ni con el carrito abierto", () => {
    expect(renderToStaticMarkup(<WhatsAppFloatButton number={null} aboveChat />)).toBe("")
    expect(renderToStaticMarkup(<WhatsAppFloatButton number="123" aboveChat />)).toBe("")
    cartState.isOpen = true
    expect(renderToStaticMarkup(<WhatsAppFloatButton number="3001234567" aboveChat />)).toBe("")
    cartState.isOpen = false
  })
})
