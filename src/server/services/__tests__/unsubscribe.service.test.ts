import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: {
      updateMany: vi.fn(),
    },
    order: {
      updateMany: vi.fn(),
    },
  },
}))

import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  processUnsubscribeEmail,
} from "../unsubscribe.service"
import { prisma } from "@/server/db/prisma"

describe("Unsubscribe Service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("genera un token firmado y lo verifica exitosamente", () => {
    const email = "usuario@tiendaonestar.com"
    const token = createUnsubscribeToken(email)

    expect(typeof token).toBe("string")
    expect(token).toContain(".")

    const verified = verifyUnsubscribeToken(token)
    expect(verified).toBe("usuario@tiendaonestar.com")
  })

  it("rechaza tokens manipulados o inválidos", () => {
    expect(verifyUnsubscribeToken("token-invalido")).toBeNull()
    expect(verifyUnsubscribeToken("")).toBeNull()

    const validToken = createUnsubscribeToken("user@test.com")
    const tamperedToken = validToken + "tampered"
    expect(verifyUnsubscribeToken(tamperedToken)).toBeNull()
  })

  it("ejecuta la baja en User y Order reseteando marketingConsentAt", async () => {
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 2 })

    const result = await processUnsubscribeEmail("User@Test.COM")

    expect(result).toEqual({
      success: true,
      usersUpdated: 1,
      ordersUpdated: 2,
    })

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { email: { equals: "user@test.com", mode: "insensitive" } },
      data: { marketingConsentAt: null },
    })

    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { customerEmail: { equals: "user@test.com", mode: "insensitive" } },
      data: { marketingConsentAt: null },
    })
  })
})
