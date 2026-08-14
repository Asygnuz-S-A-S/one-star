import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  consumeAdminLoginAttempt,
  resetAdminLoginAttempts,
} from "../admin-login-rate-limit.service"

describe("admin login rate limit", () => {
  it("bloquea el sexto intento de la misma IP y correo dentro de la ventana", () => {
    const ip = "198.51.100.10"
    const email = "admin-limit@example.com"
    const now = 1_000

    for (let attempt = 1; attempt <= 5; attempt++) {
      expect(consumeAdminLoginAttempt(ip, email, now)).toEqual({ allowed: true })
    }

    expect(consumeAdminLoginAttempt(ip, email, now)).toEqual({
      allowed: false,
      retryAfterSeconds: 900,
    })
  })

  it("limpia el contador después de una autenticación correcta", () => {
    const ip = "198.51.100.11"
    const email = "admin-reset@example.com"
    const now = 2_000

    for (let attempt = 1; attempt <= 5; attempt++) {
      consumeAdminLoginAttempt(ip, email, now)
    }
    resetAdminLoginAttempts(ip, email)

    expect(consumeAdminLoginAttempt(ip, email, now)).toEqual({ allowed: true })
  })

  it("permite un nuevo intento cuando vence la ventana", () => {
    const ip = "198.51.100.12"
    const email = "admin-expired@example.com"
    const now = 3_000

    for (let attempt = 1; attempt <= 5; attempt++) {
      consumeAdminLoginAttempt(ip, email, now)
    }

    expect(consumeAdminLoginAttempt(ip, email, now + 15 * 60 * 1_000)).toEqual({
      allowed: true,
    })
  })

  it("comparte el contador entre variaciones de mayúsculas y espacios del correo", () => {
    const ip = "198.51.100.13"
    const now = 4_000

    for (let attempt = 1; attempt <= 5; attempt++) {
      consumeAdminLoginAttempt(ip, " Admin@Example.com ", now)
    }

    expect(consumeAdminLoginAttempt(ip, "admin@example.com", now)).toMatchObject({
      allowed: false,
    })
  })

  it("rechaza claves nuevas cuando alcanza el máximo y no hay entradas vencidas", () => {
    const now = 5_000
    const oldestIp = "198.51.100.14"
    const oldestEmail = "oldest-admin@example.com"

    for (let attempt = 1; attempt <= 5; attempt++) {
      consumeAdminLoginAttempt(oldestIp, oldestEmail, now)
    }
    let overflowResult = consumeAdminLoginAttempt("203.0.113.0", "admin-0@example.com", now)
    for (let index = 1; index <= 10_000; index++) {
      overflowResult = consumeAdminLoginAttempt(
        `203.0.113.${index}`,
        `admin-${index}@example.com`,
        now
      )
    }

    expect(overflowResult).toMatchObject({ allowed: false })
    expect(consumeAdminLoginAttempt(oldestIp, oldestEmail, now)).toMatchObject({
      allowed: false,
    })
  })
})
