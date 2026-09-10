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
// CRON JOBS INTERNOS
//
// node-cron necesita un proceso Node vivo entre ejecuciones. El despliegue es
// un contenedor Docker (`output: "standalone"`), así que ese proceso existe y
// las tareas se programan aquí dentro.
//
// Los endpoints GET /api/cron/sync-erp y GET /api/cron/expire-orders siguen
// disponibles para un disparador externo (crontab, EventBridge…) con el header
// Authorization: Bearer $CRON_SECRET. Si se usa uno, hay que apagar el cron
// interno con DISABLE_INTERNAL_CRON=1 para no ejecutar la tarea dos veces.
// ─────────────────────────────────────────────────────────────────────────────
const isInternalCronDisabled = process.env.DISABLE_INTERNAL_CRON === "1"

// Evita que el cron se inicialice múltiples veces en dev con HMR
const globalWithCron = global as typeof global & { __cronInitialized?: boolean }

if (!isInternalCronDisabled && !globalWithCron.__cronInitialized) {
  globalWithCron.__cronInitialized = true

  console.log("[Cron] Inicializando tareas programadas internas...")

  void (async () => {
    // Import dinámico: mantiene node-cron fuera del bundle cuando el cron
    // interno está apagado y nunca va a usarlo.
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

    // Vence los pedidos que quedaron PENDING sin notificación de la pasarela.
    // Mismo horario que tenía la programación externa: 07:30 en la zona horaria
    // del proceso. Es idempotente: una segunda pasada no encuentra nada.
    cron.schedule("30 7 * * *", async () => {
      try {
        const { expireAbandonedOrders } = await import(
          "./server/services/order.service"
        )
        const expired = await expireAbandonedOrders()

        if (expired.length > 0) {
          console.log(`[Cron] Pedidos abandonados vencidos: ${expired.length}.`)
        }
      } catch (err) {
        console.error("[Cron] Error venciendo pedidos abandonados:", err)
      }
    })
  })()
}
