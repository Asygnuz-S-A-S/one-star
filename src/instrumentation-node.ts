import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Captura el 100% de los errores, 10% de las transacciones de rendimiento
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // No enviar en desarrollo a menos que SENTRY_DSN esté explícitamente definido
  enabled: Boolean(process.env.SENTRY_DSN),
})
