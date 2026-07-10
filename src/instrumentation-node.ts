import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Captura el 100% de los errores, 10% de las transacciones de rendimiento
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // No enviar en desarrollo a menos que SENTRY_DSN esté explícitamente definido
  enabled: Boolean(process.env.SENTRY_DSN),
})

// === CRON JOB INTERNO (Solo se ejecuta en el servidor) ===
import * as cron from "node-cron"

// Evita que el cron se inicialice múltiples veces en dev con HMR
if (!(global as any).__cronInitialized) {
  console.log("[Cron] Inicializando tareas programadas internas...")

  // Ejecuta la sincronización cada 30 minutos
  cron.schedule("*/30 * * * *", async () => {
    console.log("[Cron] Ejecutando sincronización automática con el ERP...")
    try {
      // Como estamos dentro del proceso Node, podemos llamar directamente al servicio
      // en vez de hacer fetch a la API (lo cual fallaría si el servidor aún está arrancando)
      const { syncCatalogFromERP } = await import("./server/services/erp-sync.service")
      const result = await syncCatalogFromERP()
      
      if (result.success) {
        console.log(`[Cron] Sincronización exitosa: ${result.processedCount} ítems procesados.`)
      } else {
        console.error(`[Cron] Sincronización falló: ${result.error}`)
      }
    } catch (err) {
      console.error("[Cron] Error no controlado en la sincronización:", err)
    }
  })

  ;(global as any).__cronInitialized = true
}
