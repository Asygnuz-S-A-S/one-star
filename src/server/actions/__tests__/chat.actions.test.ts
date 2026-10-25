import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  isChatRateLimited,
  resetChatRateLimitForTesting,
  CHAT_MAX_MESSAGES_PER_IP,
} from "../chat.actions"

describe("chat.actions rate limit", () => {
  beforeEach(() => {
    resetChatRateLimitForTesting()
  })

  it("permite hasta 20 mensajes por dirección IP", () => {
    const ip = "190.24.100.5"
    for (let i = 0; i < CHAT_MAX_MESSAGES_PER_IP; i++) {
      expect(isChatRateLimited(ip)).toBe(false)
    }
    // El mensaje 21 debe ser bloqueado por exceder el límite
    expect(isChatRateLimited(ip)).toBe(true)
  })

  it("mantiene límites independientes entre diferentes IPs", () => {
    const ip1 = "190.24.100.1"
    const ip2 = "190.24.100.2"

    for (let i = 0; i < CHAT_MAX_MESSAGES_PER_IP; i++) {
      expect(isChatRateLimited(ip1)).toBe(false)
    }
    expect(isChatRateLimited(ip1)).toBe(true)

    // ip2 aún tiene todos sus intentos disponibles
    expect(isChatRateLimited(ip2)).toBe(false)
  })
})
