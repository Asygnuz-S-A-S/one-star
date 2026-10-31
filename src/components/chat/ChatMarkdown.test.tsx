import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import ChatMarkdown from "./ChatMarkdown"

const html = (text: string) => renderToStaticMarkup(<ChatMarkdown text={text} />)

describe("ChatMarkdown", () => {
  it("convierte negrita, cursiva y párrafos", () => {
    const out = html("Hola **Juan**\n\nTenemos el *Mafate 5*.")
    expect(out).toContain("<strong>Juan</strong>")
    expect(out).toContain("<em>Mafate 5</em>")
    expect(out.match(/<p>/g)).toHaveLength(2)
    expect(out).not.toContain("**")
  })

  it("arma listas con viñetas y numeradas", () => {
    const out = html("Tallas:\n- 40\n- 41\n1. Paso uno\n2. Paso dos")
    expect(out).toContain("<ul")
    expect(out.match(/<li>/g)).toHaveLength(4)
    expect(out).toContain("<ol")
  })

  it("muestra links internos y externos seguros", () => {
    const out = html("Míralo [aquí](/productos/hoka-mafate-5) o en [HOKA](https://www.hoka.com)")
    expect(out).toContain('href="/productos/hoka-mafate-5"')
    expect(out).toContain('href="https://www.hoka.com"')
    expect(out).toContain('rel="noopener noreferrer"')
  })

  it("no convierte en link un javascript: ni inyecta HTML", () => {
    const out = html("[clic](javascript:alert(1)) <img src=x onerror=alert(1)>")
    expect(out).not.toContain("<a")
    expect(out).not.toContain("<img")
    expect(out).toContain("&lt;img")
  })
})
