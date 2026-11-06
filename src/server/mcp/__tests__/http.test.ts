import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
const consumePublicRateLimit = vi.hoisted(() => vi.fn())
vi.mock("@/server/services/public-rate-limit.service", () => ({ consumePublicRateLimit }))
const authenticateMcpToken = vi.hoisted(() => vi.fn())
vi.mock("@/server/services/mcp-token.service", () => ({ authenticateMcpToken }))

import { authorizeMcpRequest } from "../http"

const request = (headers: Record<string, string>) => new Request("https://new.tiendaonestar.com/api/mcp", { method: "POST", headers })

describe("authorizeMcpRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://new.tiendaonestar.com")
    consumePublicRateLimit.mockResolvedValue({ allowed: true })
    authenticateMcpToken.mockResolvedValue(null)
  })

  it("sin token válido responde 401 aunque traiga cookies de admin", async () => {
    const result = await authorizeMcpRequest(request({ cookie: "better-auth.session_token=abc" }))
    expect("response" in result && result.response.status).toBe(401)
    expect(authenticateMcpToken).toHaveBeenCalledWith(null)
  })

  it("bloquea navegadores de otro sitio", async () => {
    const result = await authorizeMcpRequest(request({ origin: "https://malo.com", authorization: "Bearer osmcp_x" }))
    expect("response" in result && result.response.status).toBe(403)
    expect(authenticateMcpToken).not.toHaveBeenCalled()
  })

  it("aplica el límite por IP antes de mirar el token", async () => {
    consumePublicRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 })
    const result = await authorizeMcpRequest(request({ authorization: "Bearer osmcp_x" }))
    expect("response" in result && result.response.status).toBe(429)
  })

  it("con token válido devuelve el admin", async () => {
    const principal = { tokenId: "t", adminUserId: "a", email: "e", name: "n", role: "SUPER_ADMIN" }
    authenticateMcpToken.mockResolvedValue(principal)
    expect(await authorizeMcpRequest(request({ authorization: "Bearer osmcp_x" }))).toEqual({ principal })
  })
})
