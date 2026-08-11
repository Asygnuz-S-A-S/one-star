import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"
import { NEXT_IMAGE_REMOTE_PATTERNS } from "./src/lib/image-optimization"

const nextConfig: NextConfig = {
  output: "standalone",
  // Nota: CSP queda pendiente a propósito — requiere infraestructura de nonces
  // e inventariar los scripts de ePayco/Sentry antes de activarla sin romper el checkout.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/",
        has: [{ type: "query", key: "preview", value: "true" }],
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ]
  },
  images: {
    remotePatterns: NEXT_IMAGE_REMOTE_PATTERNS,
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  sourcemaps: {
    // No exponer source maps al cliente en producción
    disable: process.env.NODE_ENV !== "production",
  },
})
