import "server-only"

import { captureMessage } from "@sentry/nextjs"
import { ADMIN_LOGIN_UNTRUSTED_IP_SECURITY_EVENT } from "./admin-login-security-event-sanitizer.service"

const ALERT_COOLDOWN_MS = 15 * 60 * 1_000
const ALERT_MESSAGE = "Admin login request without a trusted IP"
const ALERT_FINGERPRINT = "admin-login-untrusted-ip"

export type UntrustedAdminLoginIpReason = "missing" | "invalid"

let nextAlertAt = 0

export function alertAdminLoginWithoutTrustedIp(
  reason: UntrustedAdminLoginIpReason,
  now = Date.now()
): void {
  if (now < nextAlertAt) return

  try {
    captureMessage(ALERT_MESSAGE, {
      level: "warning",
      fingerprint: [ALERT_FINGERPRINT],
      tags: {
        security_event: ADMIN_LOGIN_UNTRUSTED_IP_SECURITY_EVENT,
        reason,
      },
    })
    nextAlertAt = now + ALERT_COOLDOWN_MS
  } catch {
    // Telemetry must never determine whether authentication can continue.
  }
}
