import * as Sentry from "@sentry/nextjs"
import { sanitizeAdminLoginSecurityEvent } from "./server/services/admin-login-security-event-sanitizer.service"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Captura el 100% de los errores, 10% de las transacciones de rendimiento
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // No enviar en desarrollo a menos que SENTRY_DSN esté explícitamente definido
  enabled: Boolean(process.env.SENTRY_DSN),
  beforeSend: sanitizeAdminLoginSecurityEvent,
})

// ─────────────────────────────────────────────────────────────────────────────
// CRON JOB INTERNO — solo en despliegues con proceso Node persistente
//
// node-cron necesita un proceso vivo entre ejecuciones. Eso existe en local,
// en Docker y en un VPS, pero NO en plataformas serverless: allí cada request
// arranca y destruye su propia instancia, así que el schedule nunca dispara.
//
// En serverless el disparador es externo (Vercel Cron / EventBridge / crontab)
// llamando a GET /api/cron/sync-erp con el header Authorization: Bearer
// $CRON_SECRET. La programación vive en vercel.json.
//
// Se detecta el entorno con process.env.VERCEL, que Vercel inyecta con valor
// "1" en build y en runtime. Así el mismo código sirve para ambas rutas de
// despliegue sin ejecutar la sincronización dos veces.
// ─────────────────────────────────────────────────────────────────────────────
const isServerless = process.env.VERCEL === "1"

// Evita que el cron se inicialice múltiples veces en dev con HMR
const globalWithCron = global as typeof global & { __cronInitialized?: boolean }

if (!isServerless && !globalWithCron.__cronInitialized) {
  globalWithCron.__cronInitialized = true

  console.log("[Cron] Inicializando tareas programadas internas...")

  void (async () => {
    // Import dinámico: mantiene node-cron fuera del bundle cuando el despliegue
    // es serverless y nunca va a usarlo.
    const cron = await import("node-cron")

    // Despierta cada minuto; la frecuencia real y el apagado viven en PostgreSQL.
    cron.schedule("* * * * *", async () => {
      try {
        const { runDueErpSync } = await import(
          "./server/services/erp-sync-scheduler.service"
        )
        const scheduled = await runDueErpSync()

        if (!scheduled.executed) return

        const result = scheduled.result

        if (result.success) {
          console.log(`[Cron] Sincronización exitosa: ${result.processedCount} ítems procesados.`)
        } else {
          console.error(`[Cron] Sincronización falló: ${result.error}`)
        }
      } catch (err) {
        console.error("[Cron] Error no controlado en la sincronización:", err)
      }
    })
  })()
}
