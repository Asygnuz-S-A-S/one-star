import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { sanitizeErpError } from "../erp-error"

describe("sanitizeErpError", () => {
  it("redacta credenciales, bearer tokens, JWT y URLs antes de exponer el error", () => {
    const unsafe =
      "Authorization: Bearer secret-token token=abc123 " +
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature " +
      "https://user:password@api.loggro.com/items?api_key=secret"

    const safe = sanitizeErpError(unsafe)

    expect(safe).not.toContain("secret-token")
    expect(safe).not.toContain("abc123")
    expect(safe).not.toContain("eyJhbGci")
    expect(safe).not.toContain("user:password")
    expect(safe).not.toContain("api_key=secret")
    expect(safe).toContain("[REDACTADO]")
  })

  it("limita el detalle, elimina controles y conserva un fallback útil", () => {
    const safe = sanitizeErpError(`falló\u0000 ${"x".repeat(2_000)}`)

    expect(safe.length).toBeLessThanOrEqual(600)
    expect(safe).not.toContain("\u0000")
    expect(sanitizeErpError(null)).toBe("El ERP reportó un error sin detalle.")
  })

  it("elimina cuerpos HTTP crudos aunque no contengan una credencial conocida", () => {
    const safe = sanitizeErpError(
      '[LoggroClient] GET /items → 500: {"internal":"detalle privado del proveedor"}'
    )

    expect(safe).toContain("500")
    expect(safe).not.toContain("detalle privado")
    expect(safe).not.toContain("internal")
  })

  it("redacta Basic auth, cookies, secretos JSON y variables de entorno", () => {
    const unsafe = [
      "Authorization: Basic dXNlcjpwYXNzd29yZA==",
      "X-API-Key: private-header-key",
      "Cookie: session=private-session; csrftoken=private-csrf",
      'Set-Cookie: auth="private-cookie"',
      '{"clientSecret":"private-client","access_token":"private-access"}',
      "LOGGRO_API_TOKEN=private-env DATABASE_URL=postgresql://user:pass@db/internal",
    ].join(" | ")

    const safe = sanitizeErpError(unsafe)

    for (const secret of [
      "dXNlcjpwYXNzd29yZA",
      "private-session",
      "private-csrf",
      "private-cookie",
      "private-client",
      "private-access",
      "private-env",
      "user:pass",
      "private-header-key",
    ]) {
      expect(safe).not.toContain(secret)
    }
  })

  it("redacta PII y reemplaza cuerpos arbitrarios por un fallback", () => {
    const pii = sanitizeErpError(
      "Falló para cliente persona@example.com, teléfono +57 300 123 4567, id 1234567890"
    )

    expect(pii).not.toContain("persona@example.com")
    expect(pii).not.toContain("300 123 4567")
    expect(pii).not.toContain("1234567890")
    expect(sanitizeErpError('{"customerName":"Persona Privada"}')).toBe(
      "El ERP reportó un error sin detalle."
    )
    expect(sanitizeErpError("<html>respuesta privada</html>")).toBe(
      "El ERP reportó un error sin detalle."
    )
    expect(sanitizeErpError("<Error>respuesta privada</Error>")).toBe(
      "El ERP reportó un error sin detalle."
    )
  })

  it("conserva mensajes operacionales propios y detalles ERP estructurados", () => {
    expect(
      sanitizeErpError(
        "Loggro respondió con stock total en cero para todo el catálogo. La sincronización se bloqueó."
      )
    ).toContain("stock total en cero")
    expect(sanitizeErpError("Producto no encontrado: SKU-1")).toBe(
      "Producto no encontrado: SKU-1"
    )
  })

  it("redacta nombres exactos y sufijos de variables sensibles con valores opacos", () => {
    const unsafe = [
      "DATABASE_URL=opaque-db",
      "DIRECT_URL='opaque direct value'",
      'PRIVATE_KEY="opaque-private-key"',
      "CUSTOM_KEY=opaque-key",
      "ERP_TOKEN=opaque-token",
      "AUTH_SECRET=opaque-secret",
      "ADMIN_PASSWORD=opaque-password",
    ].join(" | ")

    const safe = sanitizeErpError(unsafe)

    for (const secret of [
      "opaque-db",
      "opaque direct value",
      "opaque-private-key",
      "opaque-key",
      "opaque-token",
      "opaque-secret",
      "opaque-password",
    ]) {
      expect(safe).not.toContain(secret)
    }
  })

  it.each([
    "cédula: 123456",
    "cedula=12345678",
    "documento 7654321",
    "identificación # 87654321",
    "idNumber: 456789",
  ])("redacta PII numérica corta etiquetada: %s", (value) => {
    const safe = sanitizeErpError(`Falló el cliente con ${value}.`)

    expect(safe).toContain("[DATO REDACTADO]")
    expect(safe).not.toMatch(/\d{6,8}/)
  })

  it("redacta variables sensibles sin depender de mayúsculas y cubre KEY_ID", () => {
    const safe = sanitizeErpError(
      "database_url=lower-db custom_key_id=opaque-id service_token=lower-token"
    )

    expect(safe).not.toContain("lower-db")
    expect(safe).not.toContain("opaque-id")
    expect(safe).not.toContain("lower-token")
  })

  it("redacta UUID de cualquier versión sin destruir mensajes operacionales con usuario", () => {
    const safe = sanitizeErpError(
      "No se pudo sincronizar el usuario actual en la bodega 123e4567-e89b-09d3-c456-426614174000."
    )

    expect(safe).toContain("usuario actual")
    expect(safe).not.toContain("123e4567-e89b-09d3-c456-426614174000")
  })
})
