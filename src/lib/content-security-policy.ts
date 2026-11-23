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
    // Píxel de Meta: fallback para navegadores sin 'strict-dynamic'.
    "https://connect.facebook.net",
    // Google Tag Manager, GA4 y Google Ads
    "https://www.googletagmanager.com",
    "https://tagmanager.google.com",
    // Microsoft Clarity (mapas de calor y analítica de comportamiento)
    "https://www.clarity.ms",
    "https://scripts.clarity.ms",
    // Widget oficial de Addi: solo su CDN y su bucket (no todo S3 ni unpkg).
    "https://s3.amazonaws.com/widgets.addi.com/",
    "https://cdn.addi.com",
  ]
  const connectSources = ["'self'"]

  connectSources.push(
    "https://*.epayco.co",
    "https://*.epayco.io",
    "https://*.ingest.sentry.io",
    "https://*.ingest.us.sentry.io",
    "https://nominatim.openstreetmap.org",
    // Píxel de Meta: fbevents.js reporta a facebook.com vía fetch/beacon.
    "https://connect.facebook.net",
    "https://www.facebook.com",
    // Google Tag Manager, Google Analytics 4 y Google Ads
    "https://www.googletagmanager.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.g.doubleclick.net",
    "https://www.googleadservices.com",
    "https://googleads.g.doubleclick.net",
    "https://stats.g.doubleclick.net",
    // Microsoft Clarity (telemetría y analítica de comportamiento)
    "https://*.clarity.ms",
    "https://c.bing.com",
    // API y servicios de Addi
    "https://*.addi.com",
    "https://*.addi-staging.com",
    // Mismo bucket que script-src: el widget solo necesita esa ruta, no todo S3.
    "https://s3.amazonaws.com/widgets.addi.com/",
    // El widget de Addi consulta sus banderas de funciones en Split.io.
    "https://*.split.io",
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
    "font-src 'self' data: https://s3.amazonaws.com",
    `connect-src ${connectSources.join(" ")}`,
    // `www.facebook.com`: el iframe que fbevents usa para ese form POST.
    // `www.googletagmanager.com`: iframe noscript de GTM.
    "frame-src 'self' https://*.epayco.co https://www.google.com https://maps.google.com https://*.addi.com https://*.addi-staging.com https://www.facebook.com https://www.googletagmanager.com",
    // `www.facebook.com`: cuando fbevents agrupa eventos (batching) los envía
    // con un form POST dentro de un iframe, no por GET. Sin esto el navegador
    // bloquea todo salvo el PageView simple.
    "form-action 'self' https://*.epayco.co https://www.facebook.com",
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
