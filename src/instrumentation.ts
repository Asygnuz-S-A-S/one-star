export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node")
  }
}

// Captura errores de requests SSR/API pasados por Next.js al hook onRequestError
export { captureRequestError as onRequestError } from "@sentry/nextjs"
