import type { ErrorEvent } from "@sentry/nextjs"
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  ADMIN_LOGIN_UNTRUSTED_IP_SECURITY_EVENT,
  sanitizeAdminLoginSecurityEvent,
} from "../admin-login-security-event-sanitizer.service"

describe("admin login security event sanitizer", () => {
  it("reduce el evento sensible a una allowlist sin secretos ni PII", () => {
    const sensitiveEvent = {
      type: undefined,
      event_id: "event-1",
      timestamp: 1_725_000_000,
      platform: "node",
      level: "warning",
      message: "Admin login request without a trusted IP",
      fingerprint: ["admin-login-untrusted-ip"],
      tags: {
        security_event: ADMIN_LOGIN_UNTRUSTED_IP_SECURITY_EVENT,
        reason: "invalid",
        email: "admin@example.com",
        ip: "203.0.113.10",
      },
      request: {
        cookies: { session: "secret-session-cookie" },
        headers: { authorization: "Bearer secret-token" },
        data: { email: "admin@example.com", password: "super-secret" },
      },
      data: { password: "super-secret" },
      cookies: { session: "secret-session-cookie" },
      user: { id: "admin-1", email: "admin@example.com", ip_address: "203.0.113.10" },
      breadcrumbs: [{ message: "admin@example.com signed in" }],
      contexts: { request: { email: "admin@example.com" } },
      extra: { password: "super-secret" },
      transaction: "POST /admin/login",
      exception: { values: [{ value: "password=super-secret" }] },
      environment: "production",
      sdk: { name: "sentry.javascript.nextjs", version: "10.63.0" },
    } as ErrorEvent & Record<string, unknown>

    const sanitized = sanitizeAdminLoginSecurityEvent(sensitiveEvent)

    expect(sanitized).toEqual({
      event_id: "event-1",
      timestamp: 1_725_000_000,
      platform: "node",
      level: "warning",
      message: "Admin login request without a trusted IP",
      fingerprint: ["admin-login-untrusted-ip"],
      tags: {
        security_event: ADMIN_LOGIN_UNTRUSTED_IP_SECURITY_EVENT,
        reason: "invalid",
      },
    })
    expect(JSON.stringify(sanitized)).not.toMatch(
      /admin@example\.com|super-secret|secret-session-cookie|203\.0\.113\.10|secret-token/
    )
  })

  it("devuelve sin cambios los eventos que no son de este control", () => {
    const ordinaryEvent: ErrorEvent = {
      type: undefined,
      event_id: "event-2",
      message: "Database unavailable",
      user: { id: "user-1" },
      extra: { diagnostic: "preserve-me" },
    }

    expect(sanitizeAdminLoginSecurityEvent(ordinaryEvent)).toBe(ordinaryEvent)
  })
})
