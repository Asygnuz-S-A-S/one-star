import { describe, expect, it } from "vitest"
import {
  customerPasswordResetEmail,
  fillPlaceholders,
  orderConfirmationEmail,
  orderShippedEmail,
  paymentRejectedEmail,
} from "../templates"

const order = { name: "Laura Gómez", orderId: "cmorder0000abcd1234", items: [{ productName: "HOKA", quantity: 1, unitPrice: 100000 }], total: 100000 }

describe("textos editables de los correos", () => {
  it("reemplaza las variables conocidas y deja las desconocidas como están", () => {
    expect(fillPlaceholders("Hola {nombre}, pedido #{pedido} {otra}", { nombre: "Laura", pedido: "ABCD1234" })).toBe(
      "Hola Laura, pedido #ABCD1234 {otra}"
    )
  })

  it("sin textos propios usa los del código", () => {
    const { subject, html } = orderConfirmationEmail(order)
    expect(subject).toBe("Confirmación de tu pedido One Star #ABCD1234")
    expect(html).toContain("Recibimos tu pedido <strong>#ABCD1234</strong>")
  })

  it("con textos propios cambia asunto y texto principal, con variables y saltos de línea", () => {
    const { subject, html } = orderConfirmationEmail({
      ...order,
      copy: { subject: "{nombre}, ya tenemos tu pedido #{pedido}", intro: "Gracias {nombre}.\nYa lo estamos alistando." },
    })
    expect(subject).toBe("Laura, ya tenemos tu pedido #ABCD1234")
    expect(html).toContain("Gracias Laura.<br />Ya lo estamos alistando.")
    expect(html).not.toContain("Aquí está el resumen")
  })

  it("el texto del admin se escapa: no puede inyectar HTML", () => {
    const { html } = orderConfirmationEmail({ ...order, copy: { intro: '<img src=x onerror="alert(1)">' } })
    expect(html).not.toContain("<img src=x")
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;")
  })

  it("un asunto o texto solo con espacios se trata como vacío", () => {
    const { subject } = orderConfirmationEmail({ ...order, copy: { subject: "   ", intro: "" } })
    expect(subject).toBe("Confirmación de tu pedido One Star #ABCD1234")
  })
})

describe("correos nuevos", () => {
  it("pedido enviado: muestra guía, transportadora y botón de rastreo", () => {
    const { subject, html } = orderShippedEmail({
      ...order,
      carrierLabel: "Envía",
      trackingNumber: "123<456>",
      trackingUrl: "https://envia.co/rastreo?guia=123",
    })
    expect(subject).toBe("Tu pedido One Star #ABCD1234 va en camino")
    expect(html).toContain("123&lt;456&gt;")
    expect(html).toContain("Envía")
    expect(html).toContain('href="https://envia.co/rastreo?guia=123"')
  })

  it("pedido enviado sin guía: no muestra el bloque ni el botón", () => {
    const { html } = orderShippedEmail({ ...order })
    expect(html).not.toContain("Número de guía")
    expect(html).not.toContain("RASTREAR")
  })

  it("pago rechazado: aclara que no hubo cobro y enlaza a la tienda", () => {
    const { html } = paymentRejectedEmail({ ...order, storeUrl: "https://tiendaonestar.com" })
    expect(html).toContain("no se hizo ningún cobro")
    expect(html).toContain('href="https://tiendaonestar.com"')
  })

  it("recuperar contraseña de cliente: incluye el enlace", () => {
    const { html } = customerPasswordResetEmail({ resetUrl: "https://tiendaonestar.com/restablecer-contrasena?token=a.b" })
    expect(html).toContain("restablecer-contrasena?token=a.b")
    expect(html).toContain("Hola,")
  })
})
