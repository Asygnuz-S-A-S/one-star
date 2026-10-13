import { describe, expect, it } from "vitest"
import { buildWhatsappUrl } from "@/lib/whatsapp"

describe("buildWhatsappUrl", () => {
  it("deja solo dígitos y codifica el mensaje", () => {
    expect(buildWhatsappUrl("+57 300 123 4567", "Hola, ¿talla 40?")).toBe(
      "https://wa.me/573001234567?text=Hola%2C%20%C2%BFtalla%2040%3F"
    )
  })

  it("devuelve null sin número usable", () => {
    expect(buildWhatsappUrl(null, "x")).toBeNull()
    expect(buildWhatsappUrl("abc", "x")).toBeNull()
  })
})
