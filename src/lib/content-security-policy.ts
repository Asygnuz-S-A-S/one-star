export interface ContentSecurityPolicyOptions {
  nonce: string
  isDevelopment: boolean
  allowSameOriginFraming: boolean
}

export function buildContentSecurityPolicy({
  nonce,
  isDevelopment,
  allowSameOriginFraming,
}: ContentSecurityPolicyOptions): string {
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(nonce)) {
    throw new Error("Invalid CSP nonce")
  }

  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "https://*.epayco.co",
  ]
  const connectSources = ["'self'"]

  connectSources.push(
    "https://*.epayco.co",
    "https://*.epayco.io",
    "https://*.ingest.sentry.io",
    "https://*.ingest.us.sentry.io",
    "https://nominatim.openstreetmap.org",
  )

  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'")
    connectSources.push("ws:", "wss:")
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "frame-src 'self' https://*.epayco.co",
    "form-action 'self' https://*.epayco.co",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "manifest-src 'self'",
    `frame-ancestors ${allowSameOriginFraming ? "'self'" : "'none'"}`,
  ]

  if (!isDevelopment) {
    directives.push("upgrade-insecure-requests")
  }

  return `${directives.join("; ")};`
}
