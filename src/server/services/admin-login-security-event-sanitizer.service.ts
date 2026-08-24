import "server-only"

import type { ErrorEvent } from "@sentry/nextjs"

export const ADMIN_LOGIN_UNTRUSTED_IP_SECURITY_EVENT =
  "admin_login_untrusted_ip"

export function sanitizeAdminLoginSecurityEvent(event: ErrorEvent): ErrorEvent {
  if (
    event.tags?.security_event !== ADMIN_LOGIN_UNTRUSTED_IP_SECURITY_EVENT
  ) {
    return event
  }

  const reason = event.tags.reason === "invalid" ? "invalid" : "missing"

  return {
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    message: event.message,
    fingerprint: event.fingerprint,
    tags: {
      security_event: ADMIN_LOGIN_UNTRUSTED_IP_SECURITY_EVENT,
      reason,
    },
  } as unknown as ErrorEvent
}
